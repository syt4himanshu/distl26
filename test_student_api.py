import sys
import os
import requests
import json

# Test script to verify student creation API

def test_login():
    """Test admin login"""
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    response = requests.post('http://localhost:5002/api/auth/login', json=login_data)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful! Role: {data.get('role')}")
        return data.get('access_token')
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_create_student(token):
    """Test student creation"""
    student_data = {
        "role": "student",
        "uid": "24CE999",
        "full_name": "Test Student Name",
        "semester": 1,
        "section": "A",
        "year_of_admission": 2024
    }
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    print(f"Creating test student: {student_data}")
    
    response = requests.post('http://localhost:5002/api/auth/register', 
                           json=student_data, headers=headers)
    
    if response.status_code == 201:
        result = response.json()
        print(f"✅ Student created successfully!")
        print(f"Student data: {json.dumps(result, indent=2)}")
        return True
    else:
        print(f"❌ Failed to create student: {response.status_code}")
        print(f"Error: {response.text}")
        return False

def test_get_students(token):
    """Test getting students list"""
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.get('http://localhost:5002/api/students', headers=headers)
    
    if response.status_code == 200:
        students = response.json()
        print(f"✅ Retrieved {len(students)} students")
        for student in students:
            print(f"  - {student.get('uid')}: {student.get('firstName', 'N/A')} {student.get('lastName', 'N/A')}")
        return True
    else:
        print(f"❌ Failed to get students: {response.status_code} - {response.text}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Student Management API\n")
    
    # Step 1: Login
    token = test_login()
    if not token:
        print("Cannot proceed without authentication")
        sys.exit(1)
    
    print()
    
    # Step 2: Get current students
    print("📋 Current students in database:")
    test_get_students(token)
    
    print()
    
    # Step 3: Try to create a new student
    print("➕ Testing student creation:")
    test_create_student(token)
    
    print()
    
    # Step 4: Get students again to verify
    print("📋 Students after creation:")
    test_get_students(token)
    
    print("\n🎉 API testing completed!")
