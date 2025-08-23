#!/usr/bin/env python3

import sqlite3
import os
from werkzeug.security import generate_password_hash

# Database file path
db_path = 'Backend/KYS_flask_backend/instance/university.db'

if not os.path.exists(db_path):
    print(f"❌ Database not found at {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("📋 Current database contents:")
    
    # Check users
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"Users: {user_count}")
    
    # Check students  
    cursor.execute("SELECT COUNT(*) FROM students")
    student_count = cursor.fetchone()[0]
    print(f"Students: {student_count}")
    
    # If no students, create some
    if student_count == 0:
        print("\n➕ Adding test students...")
        
        # First create user accounts
        students_data = [
            ("21ce001", "21CE001", "Rahul", "", "Sharma", 6, "A", 2021),
            ("21ce002", "21CE002", "Priya", "", "Patel", 5, "B", 2021), 
            ("22ce003", "22CE003", "Amit", "", "Kumar", 3, "A", 2022),
            ("22ce004", "22CE004", "Sneha", "", "Singh", 4, "B", 2022)
        ]
        
        for username, uid, fname, mname, lname, sem, sec, year in students_data:
            # Create user
            password_hash = generate_password_hash("student123")
            cursor.execute("""
                INSERT INTO users (username, role, password_hash) 
                VALUES (?, ?, ?)
            """, (username, "student", password_hash))
            
            user_id = cursor.lastrowid
            
            # Create student
            cursor.execute("""
                INSERT INTO students (uid, first_name, middle_name, last_name, semester, section, year_of_admission, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid, fname, mname, lname, sem, sec, year, user_id))
            
            print(f"  ✅ Created {uid}: {fname} {lname}")
        
        conn.commit()
        print("🎉 Test students created successfully!")
        
    else:
        print("\n👥 Existing students:")
        cursor.execute("SELECT uid, first_name, last_name, semester, section FROM students")
        students = cursor.fetchall()
        for student in students:
            print(f"  - {student[0]}: {student[1]} {student[2]} (Sem {student[3]}, Sec {student[4]})")
    
    conn.close()
    print("\n✅ Database setup completed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
