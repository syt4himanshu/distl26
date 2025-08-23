import sys
import os
sys.path.append('E:/Work/Final_colab/Backend/KYS_flask_backend')

from main import app, db, Student, User
from werkzeug.security import generate_password_hash

print("Testing database connection...")

with app.app_context():
    try:
        # Check if students exist
        student_count = Student.query.count()
        print(f"Current students in database: {student_count}")
        
        if student_count == 0:
            print("Adding test students...")
            
            # Create test students
            test_students = [
                {
                    "uid": "21CE001", "first_name": "Rahul", "last_name": "Sharma",
                    "semester": 6, "section": "A", "year_of_admission": 2021
                },
                {
                    "uid": "21CE002", "first_name": "Priya", "last_name": "Patel", 
                    "semester": 5, "section": "B", "year_of_admission": 2021
                },
                {
                    "uid": "22CE003", "first_name": "Amit", "last_name": "Kumar",
                    "semester": 3, "section": "A", "year_of_admission": 2022
                }
            ]
            
            for student_data in test_students:
                # Create user account
                user = User(
                    username=student_data["uid"].lower(),
                    role="student",
                    password_hash=generate_password_hash("student123")
                )
                db.session.add(user)
                db.session.flush()
                
                # Create student profile
                student = Student(**student_data, user_id=user.id)
                db.session.add(student)
                print(f"Created: {student_data['uid']} - {student_data['first_name']} {student_data['last_name']}")
            
            db.session.commit()
            print("✅ Test students created!")
        else:
            print("Students already exist:")
            students = Student.query.all()
            for s in students:
                print(f"  - {s.uid}: {s.first_name} {s.last_name}")
                
    except Exception as e:
        print(f"❌ Database error: {e}")
        
print("Database test completed.")
