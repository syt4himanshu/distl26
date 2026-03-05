import os
import string
import logging
from datetime import datetime, date
import random
from flask import Flask, Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from sqlalchemy import Date
from sqlalchemy.orm import joinedload
from functools import wraps
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
    , get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import jwt
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from werkzeug.exceptions import HTTPException

# --------------------------------------
# App & Config
# --------------------------------------
load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


def require_env(var_name):
    value = os.environ.get(var_name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {var_name}")
    return value


app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = require_env("DATABASE_URL")
app.config["SECRET_KEY"] = require_env("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = require_env("JWT_SECRET_KEY")

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
app.config["SESSION_COOKIE_SECURE"] = True
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "pool_size": int(os.environ.get("DB_POOL_SIZE", "5")),
    "max_overflow": int(os.environ.get("DB_MAX_OVERFLOW", "2")),
}

db = SQLAlchemy(app)
jwt_manager = JWTManager(app)
migrate = Migrate(app, db)
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per hour"],
)
force_https = os.environ.get("FORCE_HTTPS", "false").lower() == "true"
Talisman(
    app,
    content_security_policy=None,
    force_https=force_https,
)

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

from sqlalchemy import text

# ============================================
# CORS CONFIGURATION
# ============================================
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

# Backward compatibility for older env var while still supporting local dev ports.
legacy_allowed_origin = os.getenv("ALLOWED_ORIGIN", "").strip()
if legacy_allowed_origin:
    ALLOWED_ORIGINS.append(legacy_allowed_origin)

# Ignore placeholder values commonly left in .env templates.
ALLOWED_ORIGINS = [
    origin for origin in ALLOWED_ORIGINS
    if "your-frontend-domain.com" not in origin
]

allow_local_dev_origins = os.getenv("ALLOW_LOCAL_DEV_ORIGINS", "true").lower() == "true"
if allow_local_dev_origins:
    ALLOWED_ORIGINS.extend([
        r"http://localhost:\d+",
        r"http://127\.0\.0\.1:\d+",
    ])

if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = [
        r"http://localhost:\d+",
        r"http://127\.0\.0\.1:\d+",
    ]

CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)

logger.info("CORS enabled for origins: %s", ALLOWED_ORIGINS)
logger.info("HTTPS enforcement (Flask-Talisman force_https): %s", force_https)

# Health check endpoint
@app.route("/health", methods=["GET", "OPTIONS"])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    response = jsonify({"error": "Not found"})
    return response, 404

@app.errorhandler(500)
def internal_error(error):
    logger.exception("Unhandled internal server error")
    response = jsonify({"error": "Internal server error"})
    return response, 500


@app.errorhandler(HTTPException)
def handle_http_exception(error):
    logger.warning("HTTP error %s at %s", error.code, request.path)
    return jsonify({"error": error.description}), error.code


@app.errorhandler(Exception)
def handle_unexpected_exception(error):
    logger.exception("Unhandled exception at %s", request.path)
    return jsonify({"error": "Internal server error"}), 500

# ============================================
# MODELS
# ============================================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, student, faculty

    # relation one-to-one
    student_profile = db.relationship("Student", backref="user", uselist=False, cascade="all, delete-orphan")
    faculty_profile = db.relationship("Faculty", backref="user", uselist=False, cascade="all, delete-orphan")

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Faculty(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(120))
    last_name = db.Column(db.String(120)) 
    contact_number = db.Column(db.String(20))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    mentees = db.relationship('Student', backref='mentor', lazy=True)
    mentoring_minutes_written = db.relationship('MentoringMinute', backref='faculty', lazy=True)


class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(20), unique=True, nullable=False)

    first_name = db.Column(db.String(120))
    middle_name = db.Column(db.String(120), nullable=True)
    last_name = db.Column(db.String(120))

    semester = db.Column(db.Integer)
    section = db.Column(db.String(10))
    year_of_admission = db.Column(db.Integer)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)

    personal_info = db.relationship('StudentPersonalInfo', backref='student', uselist=False, cascade='all, delete-orphan')
    past_education_records = db.relationship('PastEducation', backref='student', cascade='all, delete-orphan')
    post_admission_records = db.relationship('PostAdmissionAcademicRecord', backref='student', cascade='all, delete-orphan')
    projects = db.relationship('Project', backref='student', cascade='all, delete-orphan')
    internships = db.relationship('Internship', backref='student', cascade='all, delete-orphan')
    cocurricular_participations = db.relationship('CoCurricularParticipation', backref='student', cascade='all, delete-orphan')
    cocurricular_organizations = db.relationship('CoCurricularOrganization', backref='student', cascade='all, delete-orphan')
    career_objective = db.relationship('CareerObjective', backref='student', uselist=False, cascade='all, delete-orphan')
    skills = db.relationship('Skills', backref='student', uselist=False, cascade='all, delete-orphan')
    swoc = db.relationship('SWOC', backref='student', uselist=False, cascade='all, delete-orphan')
    mentoring_minutes = db.relationship('MentoringMinute', backref='student', cascade='all, delete-orphan')

    @property
    def full_name(self):
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(filter(None, parts))


class StudentPersonalInfo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False, unique=True)

    mobile_no = db.Column(db.String(20), nullable=False)
    personal_email = db.Column(db.String(255), nullable=False)
    college_email = db.Column(db.String(255), nullable=False)

    linked_in_id = db.Column(db.String(255), nullable=False)
    permanent_address = db.Column(db.Text, nullable=False)

    dob = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(10), nullable=False)

    father_name = db.Column(db.String(120), nullable=False)
    father_mobile_no = db.Column(db.String(20), nullable=False)
    father_email = db.Column(db.String(255), nullable=True)
    father_occupation = db.Column(db.String(255), nullable=False)

    mother_name = db.Column(db.String(120), nullable=False)
    mother_mobile_no = db.Column(db.String(20), nullable=False)
    mother_email = db.Column(db.String(255), nullable=True)
    mother_occupation = db.Column(db.String(255), nullable=False)

    emergency_contact_name = db.Column(db.String(120), nullable=False)
    emergency_contact_number = db.Column(db.String(20), nullable=False)
    blood_group = db.Column(db.String(5), nullable=True)
    category = db.Column(db.String(20), nullable=True)
    aadhar_number = db.Column(db.String(14), nullable=True)
    mis_uid = db.Column(db.String(50), nullable=True)
    github_id = db.Column(db.String(255), nullable=True)
    present_address = db.Column(db.Text, nullable=True)
    guardian_name = db.Column(db.String(120), nullable=True)
    guardian_mobile = db.Column(db.String(15), nullable=True)
    guardian_email = db.Column(db.String(255), nullable=True)
    photo_url = db.Column(db.Text, nullable=True)
    photo_public_id = db.Column(db.String(255), nullable=True)


class PastEducation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    exam_name = db.Column(db.String(100), nullable=False)
    percentage = db.Column(db.Float, nullable=False)
    year_of_passing = db.Column(db.Integer, nullable=False)


class PostAdmissionAcademicRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    semester = db.Column(db.Integer, nullable=False)
    sgpa = db.Column(db.Float, nullable=False)
    backlog_subjects = db.Column(db.Text, nullable=True)


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    title = db.Column(db.String(255))
    description = db.Column(db.String(255))


class Internship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    company_name = db.Column(db.String(255))
    domain = db.Column(db.String(255))
    internship_type = db.Column(db.String(20))
    paid_unpaid = db.Column(db.String(10))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)


class CoCurricularParticipation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    name = db.Column(db.String(255))
    date = db.Column(db.Date)
    level = db.Column(db.String(100))
    awards = db.Column(db.String(255), nullable=True)


class CoCurricularOrganization(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    name = db.Column(db.String(255))
    date = db.Column(db.Date)
    level = db.Column(db.String(100))
    remark = db.Column(db.String(255), nullable=True)


class CareerObjective(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    career_goal = db.Column(db.String(50), nullable=False)
    specific_details = db.Column(db.Text, nullable=True)
    clarity_preparedness = db.Column(db.String(20))
    interested_in_campus_placement = db.Column(db.Boolean)
    campus_placement_reasons = db.Column(db.Text, nullable=True)


class Skills(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False, unique=True)

    programming_languages = db.Column(db.Text, nullable=True)
    technologies_frameworks = db.Column(db.Text, nullable=True)
    domains_of_interest = db.Column(db.Text, nullable=True)
    familiar_tools_platforms = db.Column(db.Text, nullable=True)


class SWOC(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False, unique=True)

    strengths = db.Column(db.Text, nullable=True)
    weaknesses = db.Column(db.Text, nullable=True)
    opportunities = db.Column(db.Text, nullable=True)
    challenges = db.Column(db.Text, nullable=True)


class MentoringMinute(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)

    semester = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date)
    remarks = db.Column(db.Text)
    suggestion = db.Column(db.Text, nullable=True)
    action = db.Column(db.Text, nullable=True)


# ============================================
# HELPERS
# ============================================
def generate_password(length=8):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(chars) for _ in range(length))

def get_current_user_id():
    """Return JWT identity normalized to int user id."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


def role_required(roles):
    """Decorator factory for role based access with JWT protection"""

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            current_user_id = get_current_user_id()
            if current_user_id is None:
                return jsonify({"error": "Invalid token identity"}), 401
            user = db.session.get(User, current_user_id)

            if not user:
                return jsonify({"error": "User not found"}), 404

            if user.role not in roles:
                return jsonify({"error": "Forbidden: Insufficient permissions"}), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator

    
def split_full_name(full_name):
    parts = full_name.strip().split()
    first_name = parts[0] if len(parts) > 0 else ""
    middle_name = " ".join(parts[1:-1]) if len(parts) > 2 else ""
    last_name = parts[-1] if len(parts) > 1 else ""
    return first_name, middle_name, last_name

def parse_date(date_str):
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def validate_past_education_payload(records):
    exam_names = [r.get("exam_name") for r in records]
    if len(exam_names) != len(set(exam_names)):
        return False, "Duplicate exam_name entries are not allowed."
    return True, ""

def validate_post_admission_records(student_semester, records):
    if student_semester < 1:
        return False, "Invalid student semester."
    if student_semester == 1 and records:
        return False, "No post admission academic records should be present for students in semester 1."
    
    expected_count = student_semester - 1
    if len(records) != expected_count:
        return False, f"Expected exactly {expected_count} post admission academic records."
    semesters = [r['semester'] for r in records]
    if len(set(semesters)) != len(semesters):
        return False, "Duplicate semester entries found."
    if any(s < 1 or s >= student_semester for s in semesters):
        return False, f"All semester values must be between 1 and {student_semester - 1}."
    return True, ""

def get_date_fields(model_class):
    return [
        column.name for column in model_class.__table__.columns
        if isinstance(column.type, Date)
    ]

def load_student_with_all_related(user_id):
    relations_to_load = [
        'past_education_records',
        'post_admission_records',
        'projects',
        'internships',
        'cocurricular_participations',
        'cocurricular_organizations',
        'personal_info',
        'career_objective',
        'skills',
        'swoc',
    ]

    query = db.session.query(User).filter(User.id == user_id)
    
    for rel in relations_to_load:
        query = query.options(joinedload(User.student_profile).joinedload(getattr(Student, rel)))

    query = query.options(joinedload(User.student_profile))

    return query.first()

def sync_related_records(student, model_class, current_records, updated_records_payload, unique_key="id"):
    with db.session.no_autoflush:
        date_fields = get_date_fields(model_class)

        existing_ids = {getattr(r, unique_key) for r in current_records}
        incoming_ids = {r.get(unique_key) for r in updated_records_payload if unique_key in r}
        to_delete_ids = existing_ids - incoming_ids
        if to_delete_ids:
            model_class.query.filter(model_class.id.in_(to_delete_ids)).delete(synchronize_session=False)

        for record_data in updated_records_payload:
            for field in date_fields:
                if field in record_data:
                    record_data[field] = parse_date(record_data[field])

            rid = record_data.get(unique_key)
            if rid and rid in existing_ids:
                record = next(r for r in current_records if getattr(r, unique_key) == rid)
                for field, value in record_data.items():
                    if field not in [unique_key, "student_id"]:
                        setattr(record, field, value)
            else:
                clean_data = {k: v for k, v in record_data.items() if k not in [unique_key, "student_id"]}
                new_record = model_class(**clean_data)
                new_record.student_id = student.id
                db.session.add(new_record)

def serialize_model(obj):
    if obj is None:
        return None
    data = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        if hasattr(value, 'isoformat'):
            value = value.isoformat()
        data[column.name] = value
    return data


def ensure_cloudinary_photo_columns():
    # Keep existing deployments working even without an Alembic migration.
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS photo_url TEXT"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS photo_public_id VARCHAR(255)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS category VARCHAR(20)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(14)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS mis_uid VARCHAR(50)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS github_id VARCHAR(255)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS present_address TEXT"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(120)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS guardian_mobile VARCHAR(15)"))
    db.session.execute(text("ALTER TABLE student_personal_info ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(255)"))
    db.session.commit()


# ============================================
# AUTH ENDPOINTS
# ============================================

@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
@limiter.limit("10 per minute")
def login():
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True) or {}
    username = data.get("username") or data.get("uid")
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
        
    if not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
        
    # JWT "sub" should be a string; using int can fail verification in newer PyJWT.
    token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": token,
        "role": user.role,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    })


@app.route("/api/auth/verify", methods=["GET"])
@jwt_required()
def verify_token():
    current_user_id = get_current_user_id()
    if current_user_id is None:
        return jsonify({"valid": False}), 401
    user = User.query.get(current_user_id)
    if user:
        return jsonify({
            "valid": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role
            }
        }), 200
    return jsonify({"valid": False}), 401


@app.route("/api/auth/verify-token", methods=["GET"])
@jwt_required(optional=True)
def verify_token_alias():
    """Alias endpoint for /api/auth/verify - frontend compatibility"""
    current_user_id = get_current_user_id()
    if not current_user_id:
        return jsonify({"valid": False}), 401
    
    user = User.query.get(current_user_id)
    if user:
        return jsonify({
            "valid": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role
            }
        }), 200
    return jsonify({"valid": False}), 401


@app.route("/api/auth/register", methods=["POST"])
@role_required(["admin"])
def register():
    data = request.get_json()
    role = data.get("role")
    
    if role == "student":
        uid = data.get("uid")
        full_name = data.get("full_name")
        semester = data.get("semester")
        section = data.get("section")
        year_of_admission = data.get("year_of_admission")

        if not uid or not full_name:
            return jsonify({"error": "Missing UID or full_name"}), 400
        if User.query.filter_by(username=uid).first():
            return jsonify({"error": "Student with given UID already exists"}), 400

        first_name, middle_name, last_name = split_full_name(full_name)

        user = User(username=uid, role="student", password_hash=generate_password_hash(uid))
        student = Student(
            uid=uid,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            semester=semester,
            section=section,
            year_of_admission=year_of_admission,
            user=user
        )
        db.session.add(user)
        db.session.add(student)
        db.session.commit()

        return jsonify({
            "message": "Student created successfully",
            "student_profile": "created",
            "user": {
                "uid": uid,
                "full_name": student.full_name,
                "first_name": student.first_name,
                "middle_name": student.middle_name,
                "last_name": student.last_name,
                "semester": student.semester,
                "section": student.section,
                "year_of_admission": student.year_of_admission
            }
        }), 201

    elif role == "faculty":
        email = data.get("email")
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        contact_number = data.get("contact_number")
        password = data.get("password", "default_password")

        if not email or not first_name or not last_name:
            return jsonify({"error": "Missing email, first_name, or last_name"}), 400
        if not email.endswith("@stvincentngp.edu.in"):
            return jsonify({"error": "Invalid email format, must end with @stvincentngp.edu.in"}), 400
        if User.query.filter_by(username=email).first():
            return jsonify({"error": "Faculty with given email already exists"}), 400

        user = User(username=email, role="faculty", password_hash=generate_password_hash(password))
        faculty = Faculty(
            email=email,
            first_name=first_name,
            last_name=last_name,
            contact_number=contact_number,
            user=user
        )
        db.session.add(user)
        db.session.add(faculty)
        db.session.commit()

        return jsonify({
            "message": "Faculty created successfully",
            "faculty_profile": "created",
            "user": {
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "contact_number": contact_number
            }
        }), 201

    else:
        return jsonify({"error": "Invalid role"}), 400


@app.route("/api/auth/register/bulk", methods=["POST"])
@role_required(["admin"])
def bulk_register_students():
    students = request.get_json()
    if not isinstance(students, list):
        return jsonify({"error": "Input must be a list of students"}), 400

    results = []
    for entry in students:
        uid = entry.get("uid")
        if not uid:
            results.append({"uid": None, "status": "failed", "error": "Missing UID"})
            continue

        if User.query.filter_by(username=uid, role="student").first():
            results.append({"uid": uid, "status": "failed", "error": "UID already exists"})
            continue

        user = User(username=uid, role="student", password_hash=generate_password_hash(uid))
        first_name, middle_name, last_name = split_full_name(entry.get("full_name", ""))
        student = Student(
            uid=uid,
            first_name=first_name,
            middle_name=middle_name,
            last_name=last_name,
            semester=entry.get("semester"),
            section=entry.get("section"),
            year_of_admission=entry.get("year_of_admission"),
            user=user
        )
        db.session.add(user)
        db.session.add(student)
        results.append({"uid": uid, "status": "success"})

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Bulk student registration failed")
        return jsonify({"error": "Database error"}), 500

    return jsonify({"result": results}), 200


@app.route("/api/auth/register/faculty/bulk", methods=["POST"])
@role_required(["admin"])
def bulk_register_faculty():
    faculties = request.get_json()
    if not isinstance(faculties, list):
        return jsonify({"error": "Input must be a list of faculty members"}), 400

    results = []
    for entry in faculties:
        email = entry.get("email")
        password = entry.get("password", "default_password")
        first_name = entry.get("first_name", "")
        last_name = entry.get("last_name", "")
        contact_number = entry.get("contact_number", "")

        if not email or not email.endswith("@stvincentngp.edu.in"):
            results.append({"email": email, "status": "failed", "error": "Invalid email format"})
            continue

        if User.query.filter_by(username=email).first():
            results.append({"email": email, "status": "failed", "error": "Faculty with given email already exists"})
            continue

        user = User(
            username=email,
            role="faculty",
            password_hash=generate_password_hash(password)
        )
        faculty = Faculty(
            email=email,
            first_name=first_name,
            last_name=last_name,
            contact_number=contact_number,
            user=user
        )
        db.session.add(user)
        db.session.add(faculty)
        results.append({"email": email, "status": "success"})

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Bulk faculty registration failed")
        return jsonify({"error": "Database error"}), 500

    return jsonify({"result": results}), 200


@app.route("/api/auth/change-password", methods=["POST"])
@role_required(["student", "faculty", "admin"])
def change_password():
    data = request.get_json()
    old_password, new_password = data.get("old_password"), data.get("new_password")
    user = db.session.get(User, get_jwt_identity())
    
    if not user.check_password(old_password):
        return jsonify({"error": "Old password incorrect"}), 400
    
    if user.check_password(new_password):
        return jsonify({"error": "New password cannot be the same as the old password"}), 400
    
    if len(new_password) < 8:
        return jsonify({"error": "The password must be of minimum 8 characters"}), 400
    
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({"message": "Password changed successfully"})


jwt_blacklist = set()

@app.route("/api/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    jwt_blacklist.add(jti)
    return jsonify({"message": "Successfully logged out"}), 200

@jwt_manager.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return jwt_payload["jti"] in jwt_blacklist


# ============================================
# STUDENT ENDPOINTS
# ============================================
students_bp = Blueprint("students", __name__, url_prefix="/students")

@students_bp.route("/me", methods=["GET"])
@role_required(["student"])
def get_my_student_profile():
    user = db.session.get(User, get_current_user_id())
    if not user.student_profile:
        return jsonify({"error": "Profile not found"}), 404
    s = user.student_profile
    response = {
        "id": s.id,
        "uid": s.uid,
        "full_name": s.full_name,
        "semester": s.semester,
        "section": s.section,
        "year_of_admission": s.year_of_admission,
        "personal_info": serialize_model(s.personal_info) if s.personal_info else None,
        "past_education_records": [serialize_model(rec) for rec in s.past_education_records] if s.past_education_records else [],
        "post_admission_records": [serialize_model(rec) for rec in s.post_admission_records] if s.post_admission_records else [],
        "projects": [serialize_model(rec) for rec in s.projects] if s.projects else [],
        "internships": [serialize_model(rec) for rec in s.internships] if s.internships else [],
        "cocurricular_participations": [serialize_model(rec) for rec in s.cocurricular_participations] if s.cocurricular_participations else [],
        "cocurricular_organizations": [serialize_model(rec) for rec in s.cocurricular_organizations] if s.cocurricular_organizations else [],
        "career_objective": serialize_model(s.career_objective) if s.career_objective else None,
        "skills": serialize_model(s.skills) if s.skills else None,
        "swoc": serialize_model(s.swoc) if s.swoc else None,
    }
    return jsonify(response)


@students_bp.route("/me", methods=["PUT"])
@role_required(["student"])
def update_my_student_profile():
    user = load_student_with_all_related(get_current_user_id())
    if not user or not user.student_profile:
        return jsonify({"error": "Profile not found"}), 404

    s = user.student_profile
    data = request.get_json()

    first_name, middle_name, last_name = split_full_name(data["full_name"])
    s.first_name = first_name
    s.middle_name = middle_name
    s.last_name = last_name

    for field in ["semester", "section", "year_of_admission"]:
        if field in data:
            setattr(s, field, data[field])

    pi_payload = data.get("personal_info")
    if pi_payload:
        pi_payload.pop("id", None)
        pi_payload.pop("student_id", None)
        pi_payload = {k: v for k, v in pi_payload.items() if hasattr(StudentPersonalInfo, k)}
        if 'dob' in pi_payload:
            pi_payload['dob'] = parse_date(pi_payload['dob'])
        if s.personal_info:
            for field, value in pi_payload.items():
                setattr(s.personal_info, field, value)
        else:
            s.personal_info = StudentPersonalInfo(**pi_payload, student_id=s.id)

    pe_payload = data.get("past_education_records", [])
    valid, err = validate_past_education_payload(pe_payload)
    if not valid:
        return jsonify({"error": err}), 400
    sync_related_records(s, PastEducation, s.past_education_records, pe_payload)

    pa_payload = data.get("post_admission_records", [])
    valid, err = validate_post_admission_records(s.semester, pa_payload)
    if not valid:
        return jsonify({"error": err}), 400
    sync_related_records(s, PostAdmissionAcademicRecord, s.post_admission_records, pa_payload)

    sync_related_records(s, Project, s.projects, data.get("projects", []))
    sync_related_records(s, Internship, s.internships, data.get("internships", []))
    sync_related_records(s, CoCurricularParticipation, s.cocurricular_participations, data.get("cocurricular_participations", []))
    sync_related_records(s, CoCurricularOrganization, s.cocurricular_organizations, data.get("cocurricular_organizations", []))

    for rel_name, model_class in [
        ("career_objective", CareerObjective),
        ("skills", Skills),
        ("swoc", SWOC),
    ]:
        rel_payload = data.get(rel_name)
        if rel_payload:
            rel_payload.pop("id", None)
            rel_payload.pop("student_id", None)

            rel_obj = getattr(s, rel_name)
            if rel_obj:
                for field, value in rel_payload.items():
                    setattr(rel_obj, field, value)
            else:
                setattr(s, rel_name, model_class(**rel_payload, student_id=s.id))

    db.session.commit()
    return jsonify({"message": "Profile updated successfully."}), 200


@app.route("/students/me/mentoring-minutes", methods=["GET"])
@role_required(["student"])
def list_student_mentoring_minutes():
    user = db.session.get(User, get_jwt_identity())
    student = user.student_profile

    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    minutes = MentoringMinute.query.filter_by(student_id=student.id).order_by(MentoringMinute.date.desc()).all()

    result = []
    for m in minutes:
        faculty = Faculty.query.get(m.faculty_id)
        result.append({
            "id": m.id,
            "faculty_email": faculty.email if faculty else None,
            "faculty_name": f"{faculty.first_name} {faculty.last_name}" if faculty else None,
            "semester": m.semester,
            "date": m.date.isoformat(),
            "remarks": m.remarks,
            "suggestion": m.suggestion,
            "action": m.action
        })

    return jsonify(result), 200


@app.route("/students/me/mentor", methods=["GET"])
@role_required(["student"])
def get_student_mentor():
    user = db.session.get(User, get_jwt_identity())
    student = user.student_profile

    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    if not student.mentor_id:
        return jsonify({"error": "No mentor assigned to this student"}), 404

    mentor = Faculty.query.get(student.mentor_id)
    if not mentor:
        return jsonify({"error": "Mentor not found"}), 404

    mentor_data = {
        "id": mentor.id,
        "email": mentor.email,
        "first_name": mentor.first_name,
        "last_name": mentor.last_name,
        "full_name": f"{mentor.first_name} {mentor.last_name}" if mentor.first_name and mentor.last_name else "Unknown",
        "contact_number": mentor.contact_number
    }

    return jsonify(mentor_data), 200


@app.route("/api/students", methods=["GET"])
@role_required(["admin", "faculty"])
def search_students():
    query = Student.query
    if "semester" in request.args:
        query = query.filter_by(semester=request.args.get("semester"))
    if "section" in request.args:
        query = query.filter_by(section=request.args.get("section"))
    if "year_of_admission" in request.args:
        query = query.filter_by(year_of_admission=request.args.get("year_of_admission"))
    if "uid" in request.args:
        query = query.filter_by(uid=request.args.get("uid"))
    if "name" in request.args:
        name = request.args.get("name")
        query = query.filter((Student.first_name.like(f"%{name}%")) | (Student.last_name.like(f"%{name}%")))
    
    results = query.all()
    
    return jsonify([{
        "uid": s.uid,
        "full_name": s.full_name,
        "semester": s.semester,
        "section": s.section,
        "year_of_admission": s.year_of_admission,
        "personal_info": serialize_model(s.personal_info) if s.personal_info else None,
        "past_education_records": [serialize_model(rec) for rec in s.past_education_records] if s.past_education_records else [],
        "post_admission_records": [serialize_model(rec) for rec in s.post_admission_records] if s.post_admission_records else [],
        "projects": [serialize_model(rec) for rec in s.projects] if s.projects else [],
        "internships": [serialize_model(rec) for rec in s.internships] if s.internships else [],
        "cocurricular_participations": [serialize_model(rec) for rec in s.cocurricular_participations] if s.cocurricular_participations else [],
        "cocurricular_organizations": [serialize_model(rec) for rec in s.cocurricular_organizations] if s.cocurricular_organizations else [],
        "career_objective": serialize_model(s.career_objective) if s.career_objective else None,
        "skills": serialize_model(s.skills) if s.skills else None,
        "swoc": serialize_model(s.swoc) if s.swoc else None,
        "mentor_id": s.mentor_id,
    } for s in results])


@app.route("/api/students/<int:student_id>", methods=["PUT"])
@role_required(["admin"])
def update_student(student_id):
    student = Student.query.get(student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "mentor_id" in data:
        if data["mentor_id"] is None:
            student.mentor_id = None
        else:
            faculty = Faculty.query.get(data["mentor_id"])
            if not faculty:
                return jsonify({"error": "Faculty not found"}), 404
            student.mentor_id = data["mentor_id"]

    try:
        db.session.commit()
        return jsonify({"message": "Student updated successfully"}), 200
    except Exception:
        db.session.rollback()
        logger.exception("Student update failed for student_id=%s", student_id)
        return jsonify({"error": "Database error"}), 500


@app.route("/student/me", methods=["GET"])
@role_required(["student"])
def get_my_student_full_profile():
    user = db.session.get(User, get_current_user_id())
    student = user.student_profile
    
    if not student:
        return jsonify({"error": "Student profile not found"}), 404
    
    response = {
        "id": student.id,
        "uid": student.uid,
        "first_name": student.first_name,
        "middle_name": student.middle_name,
        "last_name": student.last_name,
        "full_name": student.full_name,
        "semester": student.semester,
        "section": student.section,
        "year_of_admission": student.year_of_admission,
        "personal_info": serialize_model(student.personal_info) if student.personal_info else None,
        "past_education_records": [serialize_model(rec) for rec in student.past_education_records] if student.past_education_records else [],
        "post_admission_records": [serialize_model(rec) for rec in student.post_admission_records] if student.post_admission_records else [],
        "projects": [serialize_model(rec) for rec in student.projects] if student.projects else [],
        "internships": [serialize_model(rec) for rec in student.internships] if student.internships else [],
        "cocurricular_participations": [serialize_model(rec) for rec in student.cocurricular_participations] if student.cocurricular_participations else [],
        "cocurricular_organizations": [serialize_model(rec) for rec in student.cocurricular_organizations] if student.cocurricular_organizations else [],
        "career_objective": serialize_model(student.career_objective) if student.career_objective else None,
        "skills": serialize_model(student.skills) if student.skills else None,
        "swoc": serialize_model(student.swoc) if student.swoc else None,
    }
    return jsonify(response)


def parse_date_iso(date_str):
    if not date_str:
        return None
    try:
        return datetime.fromisoformat(date_str.replace("Z", "")).date()
    except Exception:
        return None


@app.route("/student/me", methods=["PUT"])
@role_required(["student"])
def update_student_profile():
    user = db.session.get(User, get_current_user_id())
    student = user.student_profile
    
    if not student:
        return jsonify({"error": "Student profile not found"}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        if "semester" in data:
            student.semester = data["semester"]
        if "section" in data:
            student.section = data["section"]

        model_mappings = {
            "personal_info": (StudentPersonalInfo, "personal_info"),
            "past_education_records": (PastEducation, "past_education_records"),
            "post_admission_records": (PostAdmissionAcademicRecord, "post_admission_records"),
            "projects": (Project, "projects"),
            "internships": (Internship, "internships"),
            "cocurricular_participations": (CoCurricularParticipation, "cocurricular_participations"),
            "cocurricular_organizations": (CoCurricularOrganization, "cocurricular_organizations"),
            "career_objective": (CareerObjective, "career_objective"),
            "skills": (Skills, "skills"),
            "swoc": (SWOC, "swoc"),
        }

        for data_key, (model_class, rel_name) in model_mappings.items():
            if data_key in data:
                rel_payload = data[data_key]
                if rel_payload is None:
                    continue

                if isinstance(rel_payload, dict):
                    for field, value in rel_payload.items():
                        if (("date" in field or "dob" in field) and 
                            field not in ["year_of_passing", "year_of_admission"]):
                            rel_payload[field] = parse_date_iso(value)

                if isinstance(rel_payload, list):
                    for item in rel_payload:
                        for field, value in item.items():
                            if (("date" in field or "dob" in field) and 
                                field not in ["year_of_passing", "year_of_admission"]):
                                item[field] = parse_date_iso(value)

                if rel_name in ["personal_info", "career_objective", "skills", "swoc"]:
                    existing_record = getattr(student, rel_name)
                    if existing_record:
                        for field, value in rel_payload.items():
                            if hasattr(existing_record, field):
                                setattr(existing_record, field, value)
                    else:
                        new_record = model_class(**rel_payload, student_id=student.id)
                        setattr(student, rel_name, new_record)
                
                else:
                    existing_records = getattr(student, rel_name)
                    for record in existing_records:
                        db.session.delete(record)
                    
                    if isinstance(rel_payload, list):
                        for item in rel_payload:
                            new_record = model_class(**item, student_id=student.id)
                            db.session.add(new_record)

        db.session.commit()
        return jsonify({"message": "Student profile updated successfully"}), 200

    except Exception:
        db.session.rollback()
        logger.exception("Student profile update failed for user_id=%s", get_current_user_id())
        return jsonify({"error": "Failed to update profile"}), 500


@app.route("/student/me/upload-photo", methods=["POST"])
@role_required(["student"])
def upload_my_photo():
    current_user_id = get_current_user_id()
    if current_user_id is None:
        return jsonify({"error": "Invalid token identity"}), 401

    user = db.session.get(User, current_user_id)
    student = user.student_profile if user else None
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    if not student.personal_info:
        return jsonify({"error": "Please save personal information first, then upload photo."}), 400

    file = request.files.get("photo")
    if not file:
        return jsonify({"error": "No file provided"}), 400

    if not file.mimetype or not file.mimetype.startswith("image/"):
        return jsonify({"error": "Invalid file type"}), 400

    file.stream.seek(0, os.SEEK_END)
    size_bytes = file.stream.tell()
    file.stream.seek(0)
    if size_bytes > 2 * 1024 * 1024:
        return jsonify({"error": "File too large. Max size is 2MB"}), 400

    if not (os.getenv("CLOUDINARY_CLOUD_NAME") and os.getenv("CLOUDINARY_API_KEY") and os.getenv("CLOUDINARY_API_SECRET")):
        return jsonify({"error": "Cloudinary credentials are missing on the server"}), 500

    try:
        personal_info = student.personal_info

        if personal_info.photo_public_id:
            cloudinary.uploader.destroy(personal_info.photo_public_id, invalidate=True)

        upload_result = cloudinary.uploader.upload(
            file,
            folder="students",
            resource_type="image",
        )

        personal_info.photo_url = upload_result.get("secure_url")
        personal_info.photo_public_id = upload_result.get("public_id")
        db.session.commit()

        return jsonify({
            "message": "Upload successful",
            "photo_url": personal_info.photo_url,
            "photo_public_id": personal_info.photo_public_id,
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Photo upload failed for user_id=%s", current_user_id)
        return jsonify({"error": "Upload failed"}), 500


# ============================================
# FACULTY ENDPOINTS
# ============================================
@app.route("/faculty/me", methods=["GET"])
@role_required(["faculty"])
def get_my_faculty():
    user = db.session.get(User, get_jwt_identity())
    f = user.faculty_profile
    return jsonify({
        "first_name": f.first_name, 
        "last_name": f.last_name,
        "email": f.email,
        "contact_number": f.contact_number
    })

@app.route("/faculty/me", methods=["PUT"])
@role_required(["faculty"])
def update_my_faculty():
    user = db.session.get(User, get_jwt_identity())
    f = user.faculty_profile
    data = request.get_json()
    for field in ["first_name", "last_name", "contact_number"]:
        if field in data:
            setattr(f, field, data[field])
    db.session.commit()
    return jsonify({"message": "Profile updated successfully"})

@app.route("/faculty/me/mentees", methods=["GET"])
@role_required(["faculty"])
def get_my_mentees():
    user = db.session.get(User, get_jwt_identity())
    faculty = user.faculty_profile

    if not faculty:
        return jsonify({"error": "Faculty profile not found"}), 404

    mentees = faculty.mentees

    mentees_data = []
    for student in mentees:
        mentees_data.append({
            "id": student.id,
            "uid": student.uid,
            "first_name": student.first_name,
            "middle_name": student.middle_name,
            "last_name": student.last_name,
            "full_name": student.full_name,
            "semester": student.semester,
            "section": student.section,
            "year_of_admission": student.year_of_admission,
            "personal_info": serialize_model(student.personal_info) if student.personal_info else None,
            "past_education_records": [serialize_model(rec) for rec in student.past_education_records] if student.past_education_records else [],
            "post_admission_records": [serialize_model(rec) for rec in student.post_admission_records] if student.post_admission_records else [],
            "projects": [serialize_model(rec) for rec in student.projects] if student.projects else [],
            "internships": [serialize_model(rec) for rec in student.internships] if student.internships else [],
            "cocurricular_participations": [serialize_model(rec) for rec in student.cocurricular_participations] if student.cocurricular_participations else [],
            "cocurricular_organizations": [serialize_model(rec) for rec in student.cocurricular_organizations] if student.cocurricular_organizations else [],
            "career_objective": serialize_model(student.career_objective) if student.career_objective else None,
            "skills": serialize_model(student.skills) if student.skills else None,
            "swoc": serialize_model(student.swoc) if student.swoc else None,
        })

    return jsonify(mentees_data), 200

@app.route("/faculty/me/mentees/<string:student_uid>/minutes", methods=["POST"])
@role_required(["faculty"])
def add_mentoring_minute(student_uid):
    user = db.session.get(User, get_jwt_identity())
    faculty = user.faculty_profile

    if not faculty:
        return jsonify({"error": "Faculty profile not found"}), 404

    student = Student.query.filter_by(uid=student_uid, mentor_id=faculty.id).first()
    if not student:
        return jsonify({"error": "Mentee not found or not assigned to this faculty"}), 404

    data = request.get_json()

    semester = student.semester
    mentoring_date = date.today()

    remarks = data.get("remarks")
    suggestion = data.get("suggestion")
    action = data.get("action")

    if not remarks:
        return jsonify({"error": "Missing required field: remarks"}), 400

    mentoring_minute = MentoringMinute(
        student_id=student.id,
        faculty_id=faculty.id,
        semester=semester,
        date=mentoring_date,
        remarks=remarks,
        suggestion=suggestion,
        action=action
    )

    try:
        db.session.add(mentoring_minute)
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Mentoring minute save failed for faculty_id=%s student_uid=%s", faculty.id, student_uid)
        return jsonify({"error": "Database error while saving mentoring minute"}), 500

    return jsonify({"message": "Mentoring minute added successfully."}), 201


@app.route("/faculty/me/mentees/<string:student_uid>/minutes", methods=["GET"])
@role_required(["faculty"])
def get_mentee_mentoring_minutes(student_uid):
    user = db.session.get(User, get_jwt_identity())
    faculty = user.faculty_profile

    if not faculty:
        return jsonify({"error": "Faculty profile not found"}), 404

    student = Student.query.filter_by(uid=student_uid, mentor_id=faculty.id).first()
    if not student:
        return jsonify({"error": "Mentee not found or not assigned to this faculty"}), 404

    minutes = MentoringMinute.query.filter_by(student_id=student.id).order_by(MentoringMinute.date.desc()).all()

    result = []
    for m in minutes:
        result.append({
            "id": m.id,
            "semester": m.semester,
            "date": m.date.isoformat(),
            "remarks": m.remarks,
            "suggestion": m.suggestion,
            "action": m.action,
            "created_by_faculty": m.faculty_id == faculty.id
        })

    return jsonify({
        "student": {
            "uid": student.uid,
            "full_name": student.full_name,
            "semester": student.semester,
            "section": student.section,
            "year_of_admission": student.year_of_admission
        },
        "mentoring_minutes": result
    }), 200


# ============================================
# ADMIN ENDPOINTS
# ============================================
@app.route("/api/admin/reset-password", methods=["POST"])
@role_required(["admin"])
def reset_password():
    data = request.get_json()
    role = data.get("role")
    username = data.get("username")
    new_password = data.get("new_password")

    if not role or role not in ("student", "faculty"):
        return jsonify({"error": "Invalid or missing role. Must be 'student' or 'faculty'"}), 400
    
    if not username:
        return jsonify({"error": "username is required"}), 400
    
    user = User.query.filter_by(username=username, role=role).first()
    
    if not user:
        return jsonify({"error": f"{role.capitalize()} with given username not found"}), 404

    if user.check_password(new_password):
        return jsonify({"error": "New password cannot be the same as the old password"}), 400
    
    if len(new_password) < 8:
        return jsonify({"error": "The password must be of minimum 8 characters"}), 400
    
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Password reset successfully"}), 200

@app.route("/api/admin/faculty/basic", methods=["GET"])
@role_required(["admin"])
def get_all_faculties():
    faculties = Faculty.query.all()
    result = [
        {
            "id": f.id,
            "email": f.email,
            "first_name": f.first_name,
            "last_name": f.last_name,
            "contact_number": f.contact_number
        }
        for f in faculties
    ]
    return jsonify(result), 200

@app.route("/api/admin/users", methods=["GET"])
@role_required(["admin"])
def get_all_users():
    users = User.query.all()
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "status": "Active",
            "created": "2024-01-01"
        })
    return jsonify(result), 200

@app.route("/api/admin/users", methods=["POST"])
@role_required(["admin"])
def create_user():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required_fields = ["username", "password", "role"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    if data["role"] not in ["admin", "faculty", "student"]:
        return jsonify({"error": "Invalid role. Must be admin, faculty, or student"}), 400

    if data["role"] == "student":
        student_fields = ["uid", "first_name", "semester", "section", "year_of_admission"]
        for field in student_fields:
            if field not in data:
                return jsonify({"error": f"Missing student field: {field}"}), 400
    
    elif data["role"] == "faculty":
        faculty_fields = ["email", "first_name", "last_name", "contact_number"]
        for field in faculty_fields:
            if field not in data:
                return jsonify({"error": f"Missing faculty field: {field}"}), 400

    existing_user = User.query.filter_by(username=data["username"]).first()
    if existing_user:
        return jsonify({"error": "Username already exists"}), 400

    if data["role"] == "student":
        existing_student = Student.query.filter_by(uid=data["uid"]).first()
        if existing_student:
            return jsonify({"error": "Student UID already exists"}), 400

    if data["role"] == "faculty":
        existing_faculty = Faculty.query.filter_by(email=data["email"]).first()
        if existing_faculty:
            return jsonify({"error": "Faculty email already exists"}), 400

    try:
        new_user = User(
            username=data["username"],
            password_hash=generate_password_hash(data["password"]),
            role=data["role"]
        )
        db.session.add(new_user)
        db.session.flush()

        profile_created = None
        profile_data = {}
        
        if data["role"] == "student":
            student = Student(
                uid=data["uid"],
                first_name=data["first_name"],
                middle_name=data.get("middle_name", ""),
                last_name=data.get("last_name", ""),
                semester=data["semester"],
                section=data["section"],
                year_of_admission=data["year_of_admission"],
                user_id=new_user.id
            )
            db.session.add(student)
            profile_created = "student"
            profile_data = {
                "uid": student.uid,
                "first_name": student.first_name,
                "middle_name": student.middle_name,
                "last_name": student.last_name,
                "semester": student.semester,
                "section": student.section,
                "year_of_admission": student.year_of_admission
            }
            
        elif data["role"] == "faculty":
            faculty = Faculty(
                email=data["email"],
                first_name=data["first_name"],
                last_name=data["last_name"],
                contact_number=data["contact_number"],
                user_id=new_user.id
            )
            db.session.add(faculty)
            profile_created = "faculty"
            profile_data = {
                "email": faculty.email,
                "first_name": faculty.first_name,
                "last_name": faculty.last_name,
                "contact_number": faculty.contact_number
            }
        
        elif data["role"] == "admin":
            profile_created = "admin"

        db.session.commit()

        response_data = {
            "message": "User created successfully",
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "role": new_user.role
            }
        }
        
        if profile_created and profile_created != "admin":
            response_data["message"] += f" with {profile_created} profile"
            response_data[f"{profile_created}_profile"] = profile_data

        return jsonify(response_data), 201
        
    except Exception:
        db.session.rollback()
        logger.exception("Admin user creation failed")
        return jsonify({"error": "Database error"}), 500

@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
@role_required(["admin"])
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        if "role" in data and data["role"] != user.role:
            return jsonify({"error": "Changing user role is not allowed. Delete and recreate the user with the new role."}), 400

        if user.role == "student":
            student = user.student_profile
            if not student:
                return jsonify({"error": "Student profile not found"}), 404

            if "uid" in data:
                if User.query.filter(User.username == data["uid"], User.id != user_id).first():
                    return jsonify({"error": "UID already exists"}), 400
                user.username = data["uid"]
                student.uid = data["uid"]

            if "full_name" in data:
                first_name, middle_name, last_name = split_full_name(data["full_name"])
                student.first_name = first_name
                student.middle_name = middle_name
                student.last_name = last_name

            for field in ["semester", "section", "year_of_admission"]:
                if field in data:
                    setattr(student, field, data[field] if data[field] != "" else None)

            response_data = {
                "message": "Student updated successfully",
                "student_profile": "updated",
                "user": {
                    "uid": student.uid,
                    "full_name": student.full_name,
                    "first_name": student.first_name,
                    "middle_name": student.middle_name,
                    "last_name": student.last_name,
                    "semester": student.semester,
                    "section": student.section,
                    "year_of_admission": student.year_of_admission
                }
            }

        elif user.role == "faculty":
            faculty = user.faculty_profile
            if not faculty:
                return jsonify({"error": "Faculty profile not found"}), 404

            if "email" in data:
                if not data["email"].endswith("@stvincentngp.edu.in"):
                    return jsonify({"error": "Invalid email format, must end with @stvincentngp.edu.in"}), 400
                if User.query.filter(User.username == data["email"], User.id != user_id).first():
                    return jsonify({"error": "Email already exists"}), 400
                user.username = data["email"]
                faculty.email = data["email"]

            for field in ["first_name", "last_name", "contact_number"]:
                if field in data:
                    setattr(faculty, field, data[field] if data[field] != "" else None)

            if "password" in data and data["password"]:
                user.password_hash = generate_password_hash(data["password"])

            response_data = {
                "message": "Faculty updated successfully",
                "faculty_profile": "updated",
                "user": {
                    "email": faculty.email,
                    "first_name": faculty.first_name,
                    "last_name": faculty.last_name,
                    "contact_number": faculty.contact_number
                }
            }

        else:
            return jsonify({"error": "Invalid user role"}), 400

        db.session.commit()
        return jsonify(response_data), 200

    except Exception:
        db.session.rollback()
        logger.exception("Admin user update failed for user_id=%s", user_id)
        return jsonify({"error": "Database error"}), 500

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@role_required(["admin"])
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    current_user = db.session.get(User, get_jwt_identity())
    if user.id == current_user.id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception:
        db.session.rollback()
        logger.exception("Admin user delete failed for user_id=%s", user_id)
        return jsonify({"error": "Database error"}), 500

@app.route("/api/admin/statistics", methods=["GET"])
@role_required(["admin"])
def get_dashboard_statistics():
    total_users = User.query.count()
    total_students = Student.query.count()
    total_teachers = Faculty.query.count()
    active_users = User.query.count()
    
    stats = {
        "totalUsers": total_users,
        "totalStudents": total_students,
        "totalTeachers": total_teachers,
        "activeUsers": active_users
    }
    return jsonify(stats), 200

@app.route("/api/admin/faculty", methods=["GET"])
@role_required(["admin"])
def get_all_faculties_for_admin():
    faculties = Faculty.query.all()
    result = []
    for faculty in faculties:
        mentees = Student.query.filter_by(mentor_id=faculty.id).all()
        
        result.append({
            "id": faculty.id,
            "uid": f"FAC{faculty.id:03d}",
            "name": f"{faculty.first_name or ''} {faculty.last_name or ''}".strip() or faculty.email.split('@')[0],
            "firstName": faculty.first_name or faculty.email.split('@')[0],
            "lastName": faculty.last_name or "",
            "email": faculty.email,
            "contact": faculty.contact_number or "+91 9876543210",
            "studentsAssigned": [student.uid for student in mentees]
        })
    return jsonify(result), 200

@app.route("/api/admin/faculty/<int:faculty_id>/mentees", methods=["GET"])
@role_required(["admin"])
def get_faculty_mentees(faculty_id):
    try:
        faculty = Faculty.query.get(faculty_id)
        if not faculty:
            return jsonify({"error": "Faculty not found"}), 404

        mentees = Student.query.filter_by(mentor_id=faculty_id).all()

        mentees_data = []
        for s in mentees:
            mentee_info = {
                "id": s.id,
                "uid": s.uid,
                "full_name": s.full_name,
                "semester": s.semester,
                "section": s.section,
                "year_of_admission": s.year_of_admission,
            }
            mentees_data.append(mentee_info)

        return jsonify(mentees_data), 200
    except Exception:
        logger.exception("Fetching faculty mentees failed for faculty_id=%s", faculty_id)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/admin/faculty/<int:faculty_id>/mentees/generate", methods=["POST"])
@role_required(["admin"])
def generate_faculty_mentees(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    faculties_without_mentees = Faculty.query.filter(~Faculty.mentees.any()).all()
    n = len(faculties_without_mentees)
    if n == 0:
        return jsonify({"error": "No faculties without mentees to assign"}), 400

    query = db.session.query(
        Student.semester,
        Student.section
    ).filter(Student.mentor_id == None).distinct()

    mentees_to_assign = []

    for semester, section in query:
        unassigned_students = Student.query.filter_by(
            semester=semester,
            section=section,
            mentor_id=None
        ).all()
        m = len(unassigned_students)

        k = m // n
        if k == 0:
            continue

        random.shuffle(unassigned_students)
        selected_students = unassigned_students[:k]

        for student in selected_students:
            mentees_to_assign.append({
                "id": student.id,
                "uid": student.uid,
                "full_name": student.full_name,
                "semester": student.semester,
                "section": student.section,
                "year_of_admission": student.year_of_admission
            })

    return jsonify(mentees_to_assign), 200

@app.route("/api/admin/faculty/<int:faculty_id>/mentees/confirm", methods=["POST"])
@role_required(["admin"])
def confirm_faculty_mentees(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    data = request.get_json()
    if not data or "student_ids" not in data:
        return jsonify({"error": "Missing student_ids list"}), 400

    student_ids = data["student_ids"]
    if not isinstance(student_ids, list):
        return jsonify({"error": "student_ids must be a list"}), 400

    students = Student.query.filter(Student.id.in_(student_ids)).all()

    if len(students) != len(student_ids):
        return jsonify({"error": "One or more student IDs not found"}), 404

    for student in students:
        student.mentor_id = faculty_id

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Mentee assignment failed for faculty_id=%s", faculty_id)
        return jsonify({"error": "Database error during assignment"}), 500

    return jsonify({"message": f"Assigned {len(students)} mentees to faculty {faculty_id} successfully."}), 200


@app.route("/api/admin/faculty/<int:faculty_id>/mentees/remove", methods=["POST"])
@role_required(["admin"])
def remove_faculty_mentees(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    data = request.get_json()
    if not data or "student_ids" not in data:
        return jsonify({"error": "Missing student_ids list"}), 400

    student_ids = data["student_ids"]
    if not isinstance(student_ids, list):
        return jsonify({"error": "student_ids must be a list"}), 400

    students = Student.query.filter(
        Student.uid.in_(student_ids),
        Student.mentor_id == faculty_id
    ).all()
    
    if len(students) != len(student_ids):
        return jsonify({"error": "One or more student IDs not found"}), 404

    for student in students:
        student.mentor_id = None

    try:
        db.session.commit()
        return jsonify({
            "message": f"Removed {len(students)} mentee assignments from faculty {faculty_id} successfully.",
            "removed_student_ids": student_ids
        }), 200
    except Exception:
        db.session.rollback()
        logger.exception("Mentee removal failed for faculty_id=%s", faculty_id)
        return jsonify({"error": "Database error during removal"}), 500


@app.route("/api/admin/student/<uid>", methods=["DELETE"])
@role_required(["admin"])
def delete_student(uid):
    s = Student.query.filter_by(uid=uid).first()
    if not s:
        return jsonify({"error": "Not found"}), 404
    
    if s.user:
        db.session.delete(s.user)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "Student deleted successfully"})

@app.route("/api/admin/faculty/<int:faculty_id>", methods=["DELETE"])
@role_required(["admin"])
def delete_faculty(faculty_id):
    f = Faculty.query.get(faculty_id)
    if not f:
        return jsonify({"error": "Not found"}), 404
    
    if f.user:
        db.session.delete(f.user)
    db.session.delete(f)
    db.session.commit()
    return jsonify({"message": "Faculty deleted successfully"})


# ============================================
# Register Blueprints
# ============================================
app.register_blueprint(students_bp)

# ============================================
# Run
# ============================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    logger.info("Starting development server on port %s", port)
    app.run(host="0.0.0.0", port=port, debug=debug)
