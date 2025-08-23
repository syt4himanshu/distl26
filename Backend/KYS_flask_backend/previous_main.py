import os
import string
import random
from flask import Flask, Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
    , get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

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

# --------------------------------------
# Models
# --------------------------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, student, faculty

    # relation one-to-one
    student_profile = db.relationship("Student", backref="user", uselist=False)
    faculty_profile = db.relationship("Faculty", backref="user", uselist=False)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Faculty(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    first_name = db.Column(db.String(120))
    last_name = db.Column(db.String(120)) 
    contact_number = db.column(db.String(20)) # All except email can be changed by faculty
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
    mentoring_minutes = db.relationship('MentoringMinute', backref='student', cascade='all, delete-orphan')

    # One-to-one relationships for career and skills
    career_objective = db.relationship('CareerObjective', backref='student', uselist=False, cascade='all, delete-orphan')
    skills = db.relationship('Skills', backref='student', uselist=False, cascade='all, delete-orphan')
    swoc = db.relationship('SWOC', backref='student', uselist=False, cascade='all, delete-orphan')

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

    semester = db.Column(db.String(20))
    date = db.Column(db.Date)
    remarks = db.Column(db.Text)
    suggestion = db.Column(db.Text, nullable=True)
    action = db.Column(db.Text, nullable=True)

    student = db.relationship('Student', backref='mentoring_minutes')
    faculty = db.relationship('Faculty', backref='mentoring_minutes_written')
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
        @jwt_required()
        def decorated(*args, **kwargs):
            current_user_id = get_jwt_identity()
            user = db.session.get(User, current_user_id)
            if user and user.role in roles:
                return fn(*args, **kwargs)
            return jsonify({"error": "Forbidden"}), 403
        return decorated
    return wrapper

def split_full_name(full_name):
    parts = full_name.strip().split()
    first_name = parts[0] if len(parts) > 0 else ""
    middle_name = " ".join(parts[1:-1]) if len(parts) > 2 else ""
    last_name = parts[-1] if len(parts) > 1 else ""
    return first_name, middle_name, last_name

def validate_past_education_payload(records):
    exam_names = [r.get("exam_name") for r in records]
    if exam_names.count("SSC") != 1:
        return False, "Exactly one SSC record is required."
    if exam_names.count("hssc_or_diploma") != 1:
        return False, "Exactly one hssc_or_diploma record is required."
    if len(exam_names) != len(set(exam_names)):
        return False, "Duplicate exam_name entries are not allowed."
    return True, ""

def validate_post_admission_records(student_semester, records):
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

def sync_related_records(student, model_class, current_records, updated_records_payload, unique_key="id"):
    existing_ids = {getattr(r, unique_key) for r in current_records}
    incoming_ids = {r.get(unique_key) for r in updated_records_payload if unique_key in r}
    to_delete_ids = existing_ids - incoming_ids
    if to_delete_ids:
        model_class.query.filter(model_class.id.in_(to_delete_ids)).delete(synchronize_session=False)
    for record_data in updated_records_payload:
        rid = record_data.get(unique_key)
        if rid and rid in existing_ids:
            record = next(r for r in current_records if getattr(r, unique_key) == rid)
            for field, value in record_data.items():
                setattr(record, field, value)
        else:
            new_record = model_class(**record_data)
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


# --------------------------------------
# Auth Endpoints
# --------------------------------------
@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username, password = data.get("username"), data.get("password")
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify(access_token=token)


@app.route("/auth/register", methods=["POST"])
@role_required(["admin"])
def register():
    data = request.get_json()
    role = data.get("role")
    if role == "student":
        uid = data.get("uid")
        if not uid:
            return jsonify({"error": "Missing UID"}), 400
        if User.query.filter_by(username=uid).first():
            return jsonify({"error": "Student with given UID already exists"}), 400

        user = User(username=uid, role="student", password_hash=generate_password_hash(uid))
        student = Student(
            uid=uid,
            first_name=data.get("first_name"),
            middle_name=data.get("middle_name"),
            last_name=data.get("last_name"),
            semester=data.get("semester"),
            section=data.get("section"),
            year=data.get("year"),
            user=user
        )
        db.session.add(user)
        db.session.add(student)
        db.session.commit()
        return jsonify({
            "message": "Student created successfully",
            "user": {
                "uid": uid,
                "first_name": student.first_name,
                "middle_name": student.middle_name,
                "last_name": student.last_name,
                "semester": student.semester,
                "section": student.section,
                "year": student.year
            }
        }), 201
    elif role == "faculty":
        email = data.get("email")
        password = data.get("password")

        if not email or not email.endswith("@stvincentngp.edu.in"):
            return jsonify({"error": "Invalid email format, must end with @stvincentngp.edu.in"}), 400
        if User.query.filter_by(username=email).first():
            return jsonify({"error": "Faculty with given email already exists"}), 400
        username = email
        user = User(username=username, role="faculty",
                    password_hash=generate_password_hash(password))
        faculty = Faculty(email=email, user=user)
        db.session.add(user)
        db.session.add(faculty)
        db.session.commit()
        return jsonify({"message": "Faculty created successfully"}), 200
    else:
        return jsonify({"error": "Invalid role"}), 400


@app.route("/auth/register/bulk", methods=["POST"])
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
        student = Student(
            uid=uid,
            first_name=entry.get("first_name"),
            middle_name=entry.get("middle_name"),  # Can be None
            last_name=entry.get("last_name"),
            semester=entry.get("semester"),
            section=entry.get("section"),
            year=entry.get("year"),
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


@app.route("/auth/change-password", methods=["POST"])
@role_required(["student", "faculty"])
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

@app.route("/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    jwt_blacklist.add(jti)
    return jsonify({"message": "Successfully logged out"}), 200

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
        "personal_info": serialize_model(s.personal_info),
        "past_education_records": [serialize_model(rec) for rec in s.past_education_records],
        "post_admission_records": [serialize_model(rec) for rec in s.post_admission_records],
        "career_activities": [serialize_model(rec) for rec in s.career_activities],
        "projects": [serialize_model(rec) for rec in s.projects],
        "internships": [serialize_model(rec) for rec in s.internships],
        "cocurricular_participations": [serialize_model(rec) for rec in s.cocurricular_participations],
        "cocurricular_organizations": [serialize_model(rec) for rec in s.cocurricular_organizations],
        "career_objective": serialize_model(s.career_objective),
        "skills": serialize_model(s.skills),
        "swoc": serialize_model(s.swoc),
    }
    return jsonify(response)


@students_bp.route("/me", methods=["PUT"])
@role_required(["student"])
def update_my_student_profile():
    user = db.session.get(User, get_jwt_identity())
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
            rel_obj = getattr(s, rel_name)
            if rel_obj:
                for field, value in rel_payload.items():
                    setattr(rel_obj, field, value)
            else:
                setattr(s, rel_name, model_class(**rel_payload, student_id=s.id))

    db.session.commit()
    return jsonify({"message": "Profile updated successfully."}), 200




# search and lightweight listing
@app.route("/students", methods=["GET"])
@role_required(["admin", "faculty"])
def search_students():
    query = Student.query
    if "semester" in request.args:
        query = query.filter_by(semester=request.args.get("semester"))
    if "section" in request.args:
        query = query.filter_by(section=request.args.get("section"))
    if "year" in request.args:
        query = query.filter_by(year=request.args.get("year"))
    if "uid" in request.args:
        query = query.filter_by(uid=request.args.get("uid"))
    if "name" in request.args:
        name = request.args.get("name")
        query = query.filter((Student.first_name.like(f"%{name}%")) | (Student.last_name.like(f"%{name}%")))
    results = query.all()
    return jsonify([{
        "uid": s.uid, 
        "name": f"{s.first_name or ''} {s.last_name or ''}".strip(),
        "profile_url": f"/students/{s.uid}"
    } for s in results])

@app.route("/students/<uid>", methods=["GET"])
@role_required(["admin", "faculty", "student"])
def get_student(uid):
    student = Student.query.filter_by(uid=uid).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404
    # student themselves can only access their record
    current_user = db.session.get(User, get_jwt_identity())
    if current_user.role == "student" and student.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify({
        "uid": student.uid,
        "first_name": student.first_name, 
        "middle_name": student.middle_name,
        "last_name": student.last_name,
        "semester": student.semester,
        "section": student.section,
        "year": student.year,
    })

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

@app.route("/admin/student/<uid>", methods=["PUT"])
@role_required(["admin"])
def update_student(uid):
    student = Student.query.filter_by(uid=uid).first()
    if not student:
        return jsonify({"error": "Student not found"}), 404

    data = request.get_json()
    for field in ["first_name", "middle_name", "last_name"]:
        if field in data:
            setattr(student, field, data[field])
    db.session.commit()
    return jsonify({"message": "Student updated successfully"})

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

@app.route("/admin/faculty/<int:faculty_id>/mentees", methods=["GET"])
@role_required(["admin"])
def get_faculty_mentees(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    # Get all students assigned to this faculty
    mentees = Student.query.filter_by(mentor_id=faculty_id).all()

    # Build mentee info list
    mentees_data = []
    for s in mentees:
        mentee_info = {
            "id": s.id,
            "uid": s.uid,
            "first_name": s.first_name,
            "middle_name": s.middle_name,
            "last_name": s.last_name,
            "semester": s.semester,
            "section": s.section,
            "year": s.year,
        }
        mentees_data.append(mentee_info)

    return jsonify(mentees_data), 200

from random import shuffle

@app.route("/admin/faculty/<int:faculty_id>/mentees/generate", methods=["POST"])
@role_required(["admin"])
def generate_faculty_mentees(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found"}), 404

    # Optionally, accept N as JSON input for number of mentees per (year, section)
    data = request.get_json(silent=True) or {}
    n = data.get("n", 3)  # Default n=3; adjust as per your logic

    # Collect all years and sections present among students
    years = db.session.query(Student.year).distinct().all()
    sections = db.session.query(Student.section).distinct().all()

    preview_mentees = []

    for year_tuple in years:
        for section_tuple in sections:
            year = year_tuple[0]
            section = section_tuple

            # Get unassigned students for this (year, section)
            unassigned_students = Student.query.filter_by(
                year=year,
                section=section,
                mentor_id=None  # Unassigned
            ).all()

            shuffle(unassigned_students)
            sampled = unassigned_students[:n]  # Take up to n students

            for mentee in sampled:
                preview_mentees.append({
                    "id": mentee.id,
                    "uid": mentee.uid,
                    "first_name": mentee.first_name,
                    "middle_name": mentee.middle_name,
                    "last_name": mentee.last_name,
                    "semester": mentee.semester,
                    "section": mentee.section,
                    "year": mentee.year
                })

    # Return the list as preview (DO NOT commit changes)
    return jsonify(preview_mentees), 200

@app.route("/admin/faculty/<int:faculty_id>/mentees/confirm", methods=["POST"])
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
# Run
# --------------------------------------
if __name__ == "__main__":
    app.run(debug=True)
