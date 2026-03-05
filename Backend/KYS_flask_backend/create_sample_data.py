import logging
from main import app, db, User, Student, Faculty
from werkzeug.security import generate_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_sample_data():
    with app.app_context():
        # Create sample students
        students_data = [
            {
                "uid": "21CE001",
                "first_name": "Rahul",
                "middle_name": "Kumar", 
                "last_name": "Sharma",
                "semester": 6,
                "section": "A",
                "year_of_admission": 2021
            },
            {
                "uid": "21CE002",
                "first_name": "Priya",
                "middle_name": "Rajesh",
                "last_name": "Patel", 
                "semester": 5,
                "section": "B",
                "year_of_admission": 2021
            },
            {
                "uid": "22CE003",
                "first_name": "Amit",
                "middle_name": "Suresh",
                "last_name": "Kumar",
                "semester": 3,
                "section": "A", 
                "year_of_admission": 2022
            }
        ]
        
        logger.info("Creating sample students...")
        for student_data in students_data:
            # Check if student already exists
            existing = Student.query.filter_by(uid=student_data["uid"]).first()
            if not existing:
                # Create user account for student
                user = User(
                    username=student_data["uid"].lower(),
                    role="student",
                    password_hash=generate_password_hash("student123")
                )
                db.session.add(user)
                db.session.flush()  # Get user ID
                
                # Create student profile
                student = Student(**student_data, user_id=user.id)
                db.session.add(student)
                logger.info(f"Created student: {student_data['uid']} - {student_data['first_name']} {student_data['last_name']}")
            else:
                logger.info(f"Student {student_data['uid']} already exists")
                
        # Create sample teachers
        teachers_data = [
            {
                "email": "john.doe@college.edu",
                "first_name": "John",
                "last_name": "Doe",
                "contact_number": "+91 9876543210"
            },
            {
                "email": "jane.smith@college.edu", 
                "first_name": "Jane",
                "last_name": "Smith",
                "contact_number": "+91 9876543211"
            }
        ]
        
        logger.info("Creating sample teachers...")
        for teacher_data in teachers_data:
            existing = Faculty.query.filter_by(email=teacher_data["email"]).first()
            if not existing:
                # Create user account
                username = teacher_data["email"].split("@")[0]
                user = User(
                    username=username,
                    role="faculty", 
                    password_hash=generate_password_hash("teacher123")
                )
                db.session.add(user)
                db.session.flush()
                
                # Create faculty profile
                faculty = Faculty(**teacher_data, user_id=user.id)
                db.session.add(faculty)
                logger.info(f"Created teacher: {teacher_data['email']} - {teacher_data['first_name']} {teacher_data['last_name']}")
            else:
                logger.info(f"Teacher {teacher_data['email']} already exists")
        
        db.session.commit()
        logger.info("✅ Sample data created successfully!")
        
        # Show summary
        student_count = Student.query.count()
        faculty_count = Faculty.query.count() 
        user_count = User.query.count()
        logger.info(f"📊 Database Summary:")
        logger.info(f"   Students: {student_count}")
        logger.info(f"   Faculty: {faculty_count}")  
        logger.info(f"   Users: {user_count}")

if __name__ == "__main__":
    create_sample_data()
