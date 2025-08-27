import os
import string
from datetime import datetime, date
import random
from flask import Flask, Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import Date
from sqlalchemy.orm import joinedload
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
    , get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import jwt

# --------------------------------------
# App & Config
# --------------------------------------
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///university.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "super-secret-key"  # replace with env in prod
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)

db = SQLAlchemy(app)
jwt = JWTManager(app)
# CORS configuration
from flask_cors import CORS

# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})



# Test endpoint to verify server is working
@app.route("/test", methods=["GET", "OPTIONS"])
def test_endpoint():
    if request.method == "OPTIONS":
        response = jsonify({"message": "OK"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    return jsonify({"message": "Server is running!"})

# Simple CORS test endpoint
@app.route("/cors-test", methods=["GET", "POST", "OPTIONS"])
def cors_test():
    if request.method == "OPTIONS":
        response = jsonify({"message": "CORS preflight OK"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        return response
    return jsonify({"message": "CORS test successful", "method": request.method})

# Health check endpoint
@app.route("/health", methods=["GET", "OPTIONS"])
def health_check():
    if request.method == "OPTIONS":
        response = jsonify({"status": "healthy"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    response = jsonify({"error": "Not found"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 404

@app.errorhandler(500)
def internal_error(error):
    response = jsonify({"error": "Internal server error"})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 500
# --------------------------------------
# Models
# --------------------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, student, faculty

    # relation one-to-one
    student_profile = db.relationship("Student", backref="user", uselist=False, cascade="all, delete-orphan")
    faculty_profile = db.relationship("Faculty", backref="user", uselist=False, cascade="all, delete-orphan")

    def check_password(self, password):
        print(self.password_hash)
        print(password)
        return check_password_hash(self.password_hash, password)


class Faculty(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(120))
    last_name = db.Column(db.String(120)) 
    contact_number = db.Column(db.String(20)) # All except email can be changed by faculty
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    # One-to-many: Faculty mentors many students
    mentees = db.relationship('Student', backref='mentor', lazy=True)

    # Mentoring minutes written by faculty
    mentoring_minutes_written = db.relationship('MentoringMinute', backref='faculty', lazy=True)


class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    uid = db.Column(db.String(20), unique=True, nullable=False)

    first_name = db.Column(db.String(120))
    middle_name = db.Column(db.String(120), nullable=True)
    last_name = db.Column(db.String(120)) # Names can be changed by admin only

    semester = db.Column(db.Integer)
    section = db.Column(db.String(10))
    year_of_admission = db.Column(db.Integer) # these 3 can be changed by student

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    # Foreign key for assigned faculty mentor
    mentor_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=True)

    # One-to-one with personal info
    personal_info = db.relationship('StudentPersonalInfo', backref='student', uselist=False, cascade='all, delete-orphan')

    # One-to-many relationships
    past_education_records = db.relationship('PastEducation', backref='student', cascade='all, delete-orphan')
    post_admission_records = db.relationship('PostAdmissionAcademicRecord', backref='student', cascade='all, delete-orphan')
    career_activities = db.relationship('CareerActivity', backref='student', cascade='all, delete-orphan')
    projects = db.relationship('Project', backref='student', cascade='all, delete-orphan')
    internships = db.relationship('Internship', backref='student', cascade='all, delete-orphan')
    cocurricular_participations = db.relationship('CoCurricularParticipation', backref='student', cascade='all, delete-orphan')
    cocurricular_organizations = db.relationship('CoCurricularOrganization', backref='student', cascade='all, delete-orphan')

    # One-to-one relationships for career and skills
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


class PastEducation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    exam_name = db.Column(db.String(100), nullable=False)  # 'SSC', 'hssc_or_diploma'
    percentage = db.Column(db.Float, nullable=False)
    year_of_passing = db.Column(db.Integer, nullable=False)


class PostAdmissionAcademicRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    semester = db.Column(db.Integer, nullable=False)  # Semester number (completed)
    sgpa = db.Column(db.Float, nullable=False)
    backlog_subjects = db.Column(db.Text, nullable=True)


class CareerActivity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    activity_name = db.Column(db.String(255), nullable=False)
    score_rank = db.Column(db.String(50), nullable=False)
    exam_date = db.Column(db.Date, nullable=False)


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
    internship_type = db.Column(db.String(20))  # "Online" or "Physical"
    paid_unpaid = db.Column(db.String(10))  # "Paid" or "Unpaid"
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)


class CoCurricularParticipation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    name = db.Column(db.String(255))
    date = db.Column(db.Date)
    level = db.Column(db.String(100))  # Institute/Dept/State/National/International
    awards = db.Column(db.String(255), nullable=True)


class CoCurricularOrganization(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    name = db.Column(db.String(255))
    date = db.Column(db.Date)
    level = db.Column(db.String(100))  # Institute/Dept/State/National/International
    remark = db.Column(db.String(255), nullable=True)


class CareerObjective(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)

    career_goal = db.Column(db.String(50), nullable=False)  # e.g., "higher studies", "job", etc.
    specific_details = db.Column(db.Text, nullable=True)
    clarity_preparedness = db.Column(db.String(20))  # e.g., unsatisfactory, satisfactory, good
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

    # student = db.relationship('Student', backref='mentoring_minutes')
    # faculty = db.relationship('Faculty', backref='mentoring_minutes_written')
# --------------------------------------
# Helpers
# --------------------------------------
def generate_password(length=8):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(chars) for _ in range(length))



def role_required(roles):
    """Decorator factory for role based access"""
    def wrapper(fn):
        from functools import wraps
        @wraps(fn)
        def decorated(*args, **kwargs):
            # Handle OPTIONS requests first (before JWT verification)
            if request.method == 'OPTIONS':
                print("DEBUG: Handling OPTIONS preflight request")
                return fn(*args, **kwargs)
            
            # For non-OPTIONS requests, apply JWT verification
            @jwt_required()
            def jwt_protected_function():
                current_user_id = get_jwt_identity()
                user = db.session.get(User, current_user_id)
                
                if not user:
                    return jsonify({"error": "User not found"}), 404
                
                if user.role not in roles:
                    return jsonify({"error": "Forbidden: Insufficient permissions"}), 403
                
                return fn(*args, **kwargs)
            
            return jwt_protected_function()
            
        return decorated
    return wrapper

    
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
        return date_str  # Already a date object
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

def validate_career_activities(records):
    activity_names = [r.get("activity_name") for r in records]
    if len(activity_names) != len(set(activity_names)):
        return False, "Duplicate career activity names are not allowed."
    return True, ""

def get_date_fields(model_class):
    return [
        column.name for column in model_class.__table__.columns
        if isinstance(column.type, Date)
    ]

def load_student_with_all_related(user_id):
    # List related attributes to eager load from Student
    relations_to_load = [
        'past_education_records',
        'post_admission_records',
        'career_activities',
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
    
    # Join load student_profile AND its related collections iteratively
    for rel in relations_to_load:
        query = query.options(joinedload(User.student_profile).joinedload(getattr(Student, rel)))

    # Eager load student_profile itself
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
            # Convert date fields in record_data dynamically
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
    
    # db.session.flush()

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


# --------------------------------------
# Auth Endpoints
# --------------------------------------


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify()
        response.headers.add("Access-Control-Allow-Origin", "http://127.0.0.1:5501")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username") or data.get("uid")  # Accept both username and uid
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
        
    if not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
        
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

        # Validate required fields
        if not uid or not full_name:
            return jsonify({"error": "Missing UID or full_name"}), 400
        if User.query.filter_by(username=uid).first():
            return jsonify({"error": "Student with given UID already exists"}), 400

        # Split full name into first_name, middle_name, last_name
        first_name, middle_name, last_name = split_full_name(full_name)

        # Create user and student
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
        password = data.get("password", "default_password")  # Default password if not provided

        # Validate required fields
        if not email or not first_name or not last_name:
            return jsonify({"error": "Missing email, first_name, or last_name"}), 400
        if not email.endswith("@stvincentngp.edu.in"):
            return jsonify({"error": "Invalid email format, must end with @stvincentngp.edu.in"}), 400
        if User.query.filter_by(username=email).first():
            return jsonify({"error": "Faculty with given email already exists"}), 400

        # Create user and faculty
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
    

# Bulk Register Faculty  End Point

@app.route("/api/auth/register/faculty/bulk", methods=["POST"])
@role_required(["admin"])
def bulk_register_faculty():
    faculties = request.get_json()
    if not isinstance(faculties, list):
        return jsonify({"error": "Input must be a list of faculty members"}), 400

    results = []
    for entry in faculties:
        email = entry.get("email")
        password = entry.get("password", "default_password")  # Default password or require it
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
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500

    return jsonify({"result": results}), 200


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
            middle_name=middle_name,  # Can be None
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
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500

    return jsonify({"result": results}), 200

# DISABLED: Student creation should only be done through User Management
# @app.route("/api/admin/students", methods=["POST"])
# @role_required(["admin"])
# def create_student():
#     """Create a new student with automatically linked user account"""
#     # This endpoint is disabled - use User Management instead
#     return jsonify({"error": "Direct student creation disabled. Use User Management."}), 400

@app.route("/api/auth/change-password", methods=["POST"])
@role_required(["student", "faculty", "admin"])
def change_password():
    data = request.get_json()
    print(data)
    old_password, new_password = data.get("old_password"), data.get("new_password")
    user = db.session.get(User, get_jwt_identity())
    print(type(user))
    
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

@app.route("/api/auth/verify", methods=["GET"])
@jwt_required()
def verify_token():
    current_user_id = get_jwt_identity()
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

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return jwt_payload["jti"] in jwt_blacklist

# --------------------------------------
# Student Endpoints
# --------------------------------------
students_bp = Blueprint("students", __name__, url_prefix="/students")

@students_bp.route("/me", methods=["GET"])
@role_required(["student"])
def get_my_student_profile():
    user = db.session.get(User, get_jwt_identity())
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
        "career_activities": [serialize_model(rec) for rec in s.career_activities] if s.career_activities else [],
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
    user = load_student_with_all_related(get_jwt_identity())
    if not user or not user.student_profile:
        return jsonify({"error": "Profile not found"}), 404

    s = user.student_profile
    data = request.get_json()

    first_name, middle_name, last_name = split_full_name(data["full_name"])
    s.first_name = first_name
    s.middle_name = middle_name
    s.last_name = last_name

    # Update simple Student fields (except uid)
    for field in ["semester", "section", "year_of_admission"]:
        if field in data:
            setattr(s, field, data[field])

    # Update personal_info (1-to-1)
    pi_payload = data.get("personal_info")
    if pi_payload:
        pi_payload.pop("id", None)  # Prevent changing primary key
        pi_payload.pop("student_id", None)  # Prevent changing foreign key
        if 'dob' in pi_payload:
            pi_payload['dob'] = parse_date(pi_payload['dob'])
        if s.personal_info:
            for field, value in pi_payload.items():
                setattr(s.personal_info, field, value)
        else:
            s.personal_info = StudentPersonalInfo(**pi_payload, student_id=s.id)

    # Validate and sync PastEducation
    pe_payload = data.get("past_education_records", [])
    valid, err = validate_past_education_payload(pe_payload)
    if not valid:
        return jsonify({"error": err}), 400
    sync_related_records(s, PastEducation, s.past_education_records, pe_payload)

    # Validate and sync PostAdmissionAcademicRecord
    pa_payload = data.get("post_admission_records", [])
    valid, err = validate_post_admission_records(s.semester, pa_payload)
    if not valid:
        return jsonify({"error": err}), 400
    sync_related_records(s, PostAdmissionAcademicRecord, s.post_admission_records, pa_payload)

    # Validate and sync CareerActivities
    ca_payload = data.get("career_activities", [])
    valid, err = validate_career_activities(ca_payload)
    if not valid:
        return jsonify({"error": err}), 400
    sync_related_records(s, CareerActivity, s.career_activities, ca_payload)

    # Sync other 1-to-many relationships (projects, internships, co-curricular)
    sync_related_records(s, Project, s.projects, data.get("projects", []))
    sync_related_records(s, Internship, s.internships, data.get("internships", []))
    sync_related_records(s, CoCurricularParticipation, s.cocurricular_participations, data.get("cocurricular_participations", []))
    sync_related_records(s, CoCurricularOrganization, s.cocurricular_organizations, data.get("cocurricular_organizations", []))

    # Update or create 1-to-1 relations: career_objective, skills, swoc
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
    """Get current student's mentor information"""
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


# search and lightweight listing
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
        "career_activities": [serialize_model(rec) for rec in s.career_activities] if s.career_activities else [],
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

    # Update mentor assignment (for deallocating students from teachers)
    if "mentor_id" in data:
        if data["mentor_id"] is None:
            student.mentor_id = None
        else:
            # Verify faculty exists if assigning
            faculty = Faculty.query.get(data["mentor_id"])
            if not faculty:
                return jsonify({"error": "Faculty not found"}), 404
            student.mentor_id = data["mentor_id"]

    # You can add more fields to update here as needed
    # For example: semester, section, etc.

    try:
        db.session.commit()
        return jsonify({"message": "Student updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500

# --------------------------------------
# Student Endpoints
# --------------------------------------
@app.route("/student/me", methods=["GET"])
@role_required(["student"])
def get_my_student_profile():
    """Get current student's complete profile"""
    user = db.session.get(User, get_jwt_identity())
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
        "career_activities": [serialize_model(rec) for rec in student.career_activities] if student.career_activities else [],
        "projects": [serialize_model(rec) for rec in student.projects] if student.projects else [],
        "internships": [serialize_model(rec) for rec in student.internships] if student.internships else [],
        "cocurricular_participations": [serialize_model(rec) for rec in student.cocurricular_participations] if student.cocurricular_participations else [],
        "cocurricular_organizations": [serialize_model(rec) for rec in student.cocurricular_organizations] if student.cocurricular_organizations else [],
        "career_objective": serialize_model(student.career_objective) if student.career_objective else None,
        "skills": serialize_model(student.skills) if student.skills else None,
        "swoc": serialize_model(student.swoc) if student.swoc else None,
    }
    return jsonify(response)



def parse_date(date_str):
    """Safely parse ISO 8601 date strings into Python date objects"""
    if not date_str:
        return None
    try:
        # Handle strings like "2025-08-04T00:00:00.000Z"
        return datetime.fromisoformat(date_str.replace("Z", "")).date()
    except Exception:
        return None


@app.route("/student/me", methods=["PUT"])
@role_required(["student"])
def update_my_student_profile():
    """Update current student's profile"""
    user = db.session.get(User, get_jwt_identity())
    student = user.student_profile
    
    if not student:
        return jsonify({"error": "Student profile not found"}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # Update basic student info (only semester and section allowed for students)
        if "semester" in data:
            student.semester = data["semester"]
        if "section" in data:
            student.section = data["section"]

        # Define model mappings for related tables
        model_mappings = {
            "personal_info": (StudentPersonalInfo, "personal_info"),
            "past_education_records": (PastEducation, "past_education_records"),
            "post_admission_records": (PostAdmissionAcademicRecord, "post_admission_records"),
            "career_activities": (CareerActivity, "career_activities"),
            "projects": (Project, "projects"),
            "internships": (Internship, "internships"),
            "cocurricular_participations": (CoCurricularParticipation, "cocurricular_participations"),
            "cocurricular_organizations": (CoCurricularOrganization, "cocurricular_organizations"),
            "career_objective": (CareerObjective, "career_objective"),
            "skills": (Skills, "skills"),
            "swoc": (SWOC, "swoc"),
        }

        # Process each section
        for data_key, (model_class, rel_name) in model_mappings.items():
            if data_key in data:
                rel_payload = data[data_key]
                if rel_payload is None:
                    continue

                # Special handling for dates inside payload
                if isinstance(rel_payload, dict):
                    for field, value in rel_payload.items():
                        # Only parse actual date fields, not year_of_passing or other year fields
                        if (("date" in field or "dob" in field) and 
                            field not in ["year_of_passing", "year_of_admission"]):
                            rel_payload[field] = parse_date(value)

                if isinstance(rel_payload, list):
                    for item in rel_payload:
                        for field, value in item.items():
                            # Only parse actual date fields, not year_of_passing or other year fields
                            if (("date" in field or "dob" in field) and 
                                field not in ["year_of_passing", "year_of_admission"]):
                                item[field] = parse_date(value)

                # Handle one-to-one relationships
                if rel_name in ["personal_info", "career_objective", "skills", "swoc"]:
                    existing_record = getattr(student, rel_name)
                    if existing_record:
                        # Update existing record
                        for field, value in rel_payload.items():
                            if hasattr(existing_record, field):
                                setattr(existing_record, field, value)
                    else:
                        # Create new record
                        new_record = model_class(**rel_payload, student_id=student.id)
                        setattr(student, rel_name, new_record)
                
                # Handle one-to-many relationships
                else:
                    # Clear existing records
                    existing_records = getattr(student, rel_name)
                    for record in existing_records:
                        db.session.delete(record)
                    
                    # Add new records
                    if isinstance(rel_payload, list):
                        for item in rel_payload:
                            new_record = model_class(**item, student_id=student.id)
                            db.session.add(new_record)

        db.session.commit()
        return jsonify({"message": "Student profile updated successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update profile", "details": str(e)}), 500

# --------------------------------------
# Faculty Endpoints
# --------------------------------------
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
            "career_activities": [serialize_model(rec) for rec in student.career_activities] if student.career_activities else [],
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

    # Find mentee student by UID
    student = Student.query.filter_by(uid=student_uid, mentor_id=faculty.id).first()
    if not student:
        return jsonify({"error": "Mentee not found or not assigned to this faculty"}), 404

    data = request.get_json()

    # Required fields in payload can be semester, date, remarks, suggestion, action
    semester = student.semester  # use student's current semester always

    #get today's date and use it as mentoring_date always (date won't be provided by user)
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
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error while saving mentoring minute", "details": str(e)}), 500

    return jsonify({"message": "Mentoring minute added successfully."}), 201


@app.route("/faculty/me/mentees/<string:student_uid>/minutes", methods=["GET"])
@role_required(["faculty"])
def get_mentee_mentoring_minutes(student_uid):
    """Get all mentoring minutes for a specific mentee student"""
    user = db.session.get(User, get_jwt_identity())
    faculty = user.faculty_profile

    if not faculty:
        return jsonify({"error": "Faculty profile not found"}), 404

    # Find mentee student by UID
    student = Student.query.filter_by(uid=student_uid, mentor_id=faculty.id).first()
    if not student:
        return jsonify({"error": "Mentee not found or not assigned to this faculty"}), 404

    # Get all mentoring minutes for this student
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
            "created_by_faculty": m.faculty_id == faculty.id  # Whether this minute was created by current faculty
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


# --------------------------------------
# Admin Endpoints
# --------------------------------------
@app.route("/admin/reset-password", methods=["POST"])
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

@app.route("/admin/faculty", methods=["GET"])
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

# New API endpoints for admin dashboard
@app.route("/api/admin/users", methods=["GET"])
@role_required(["admin"])
def get_all_users():
    """Get all users for admin dashboard"""
    users = User.query.all()
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "status": "Active",  # You can add a status field to User model later if needed
            "created": "2024-01-01"  # You can add created_at field to User model later if needed
        })
    return jsonify(result), 200

@app.route("/api/admin/users", methods=["POST"])
@role_required(["admin"])
def create_user():
    """Create a new user with detailed profile information"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Common required fields for all users
    required_fields = ["username", "password", "role"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Validate role
    if data["role"] not in ["admin", "faculty", "student"]:
        return jsonify({"error": "Invalid role. Must be admin, faculty, or student"}), 400

    # Role-specific validation
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

    # Check if username already exists
    existing_user = User.query.filter_by(username=data["username"]).first()
    if existing_user:
        return jsonify({"error": "Username already exists"}), 400

    # Check if UID already exists for students
    if data["role"] == "student":
        existing_student = Student.query.filter_by(uid=data["uid"]).first()
        if existing_student:
            return jsonify({"error": "Student UID already exists"}), 400

    # Check if email already exists for faculty
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
        db.session.flush()  # Get the user ID

        profile_created = None
        profile_data = {}
        
        if data["role"] == "student":
            # Create student profile with all provided data
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
            # Create faculty profile with all provided data
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
            # For admin, we only create the user, no additional profile
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
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Database error in create_user: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Database error", "details": str(e)}), 500

# Update user endpoint

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
        # Prevent role changes to avoid orphaned profiles
        if "role" in data and data["role"] != user.role:
            return jsonify({"error": "Changing user role is not allowed. Delete and recreate the user with the new role."}), 400

        if user.role == "student":
            student = user.student_profile
            if not student:
                return jsonify({"error": "Student profile not found"}), 404

            # Update User.username if uid is provided
            if "uid" in data:
                if User.query.filter(User.username == data["uid"], User.id != user_id).first():
                    return jsonify({"error": "UID already exists"}), 400
                user.username = data["uid"]
                student.uid = data["uid"]

            # Update Student fields
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

            # Update User.username if email is provided
            if "email" in data:
                if not data["email"].endswith("@stvincentngp.edu.in"):
                    return jsonify({"error": "Invalid email format, must end with @stvincentngp.edu.in"}), 400
                if User.query.filter(User.username == data["email"], User.id != user_id).first():
                    return jsonify({"error": "Email already exists"}), 400
                user.username = data["email"]
                faculty.email = data["email"]

            # Update Faculty fields
            for field in ["first_name", "last_name", "contact_number"]:
                if field in data:
                    setattr(faculty, field, data[field] if data[field] != "" else None)

            # Update password if provided
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

    except Exception as e:
        db.session.rollback()
        print(f"❌ Database error in update_user: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Database error", "details": str(e)}), 500

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@role_required(["admin"])
def delete_user(user_id):
    """Delete a user"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Prevent deleting the current admin user
    current_user = db.session.get(User, get_jwt_identity())
    if user.id == current_user.id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500

@app.route("/api/admin/statistics", methods=["GET"])
@role_required(["admin"])
def get_dashboard_statistics():
    """Get dashboard statistics"""
    total_users = User.query.count()
    total_students = Student.query.count()
    total_teachers = Faculty.query.count()
    active_users = User.query.count()  # For now, assume all users are active
    
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
    """Get all faculty for admin dashboard with enhanced info"""
    faculties = Faculty.query.all()
    result = []
    for faculty in faculties:
        # Count assigned students
        mentees = Student.query.filter_by(mentor_id=faculty.id).all()
        
        result.append({
            "id": faculty.id,
            "uid": f"FAC{faculty.id:03d}",  # Generate UID like FAC001
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
    print(f"DEBUG: Accessing faculty mentees endpoint for faculty_id: {faculty_id}")
    try:
        faculty = Faculty.query.get(faculty_id)
        if not faculty:
            print(f"DEBUG: Faculty not found for ID: {faculty_id}")
            return jsonify({"error": "Faculty not found"}), 404

        # Get all students assigned to this faculty
        mentees = Student.query.filter_by(mentor_id=faculty_id).all()
        print(f"DEBUG: Found {len(mentees)} mentees for faculty {faculty_id}")

        # Build mentee info list
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

        print(f"DEBUG: Returning {len(mentees_data)} mentees")
        return jsonify(mentees_data), 200
    except Exception as e:
        print(f"DEBUG: Error in get_faculty_mentees: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@app.route("/api/admin/faculty/<int:faculty_id>/mentees/generate", methods=["POST"])
@role_required(["admin"])
def generate_faculty_mentees(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    # Step 1: Count number of faculties with currently zero mentees
    faculties_without_mentees = Faculty.query.filter(~Faculty.mentees.any()).all()
    n = len(faculties_without_mentees)
    if n == 0:
        return jsonify({"error": "No faculties without mentees to assign"}), 400

    # Step 2: For each semester and section, find unassigned students and count them
    # Get distinct semesters and sections from unassigned students
    query = db.session.query(
        Student.semester,
        Student.section
    ).filter(Student.mentor_id == None).distinct()

    mentees_to_assign = []

    for semester, section in query:
        # Count unassigned students in this semester and section (m)
        unassigned_students = Student.query.filter_by(
            semester=semester,
            section=section,
            mentor_id=None
        ).all()
        m = len(unassigned_students)

        # Calculate k = m // n (floor division)
        k = m // n
        if k == 0:
            # if zero, skip assigning for this semester-section
            continue

        # Shuffle unassigned students list for random selection
        random.shuffle(unassigned_students)
        # Select first k students for this faculty
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

    # Return preview of selected mentees for this faculty (do NOT commit here)
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

    # Query all students by the given ids who are currently unassigned or assigned to this faculty
    students = Student.query.filter(Student.id.in_(student_ids)).all()

    # Check if any student ID is invalid or not found
    if len(students) != len(student_ids):
        return jsonify({"error": "One or more student IDs not found"}), 404

    # Assign each student to the faculty
    for student in students:
        student.mentor_id = faculty_id

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error during assignment", "details": str(e)}), 500

    return jsonify({"message": f"Assigned {len(students)} mentees to faculty {faculty_id} successfully."}), 200



@app.route("/api/admin/faculty/<int:faculty_id>/mentees/remove", methods=["POST"])
@role_required(["admin"])
def remove_faculty_mentees(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    data = request.get_json()
    print("data", data)
    if not data or "student_ids" not in data:
        return jsonify({"error": "Missing student_ids list"}), 400

    student_ids = data["student_ids"]
    if not isinstance(student_ids, list):
        return jsonify({"error": "student_ids must be a list"}), 400

    # Query all students specified who are currently assigned to this faculty
    students = Student.query.filter(
        Student.uid.in_(student_ids),
        Student.mentor_id == faculty_id
    ).all()
    print("students", students)
    if len(students) != len(student_ids):
        return jsonify({"error": "One or more student IDs not found"}), 404

    # Remove mentor assignment
    for student in students:
        student.mentor_id = None

    try:
        db.session.commit()
        return jsonify({
            "message": f"Removed {len(students)} mentee assignments from faculty {faculty_id} successfully.",
            "removed_student_ids": student_ids
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error during removal", "details": str(e)}), 500



@app.route("/admin/student/<uid>", methods=["DELETE"])
@role_required(["admin"])
def delete_student(uid):
    s = Student.query.filter_by(uid=uid).first()
    if not s:
        return jsonify({"error": "Not found"}), 404
    
    if s.user:
        db.session.delete(s.user)
    db.session.delete(s)  # delete user cascade
    db.session.commit()
    return jsonify({"message": "Student deleted successfully"})

@app.route("/admin/faculty/<int:faculty_id>", methods=["DELETE"])
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


# --------------------------------------
# Register_Blueprints
# --------------------------------------
app.register_blueprint(students_bp)
# --------------------------------------
# Run
# --------------------------------------
if __name__ == "__main__":
    print("DEBUG: Starting Flask server...")
    print("DEBUG: CORS enabled with origins:", ["http://127.0.0.1:5501", "http://localhost:5501", "http://127.0.0.1:3000", "http://localhost:3000"])
    with app.app_context():
        # Create all database tables
        print("DEBUG: Creating database tables...")
        db.create_all()
        print("✅ Database tables created successfully")
    
    print("DEBUG: Server starting on port 5002...")
    app.run(debug=True, port=5002)
