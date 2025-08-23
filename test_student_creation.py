#!/usr/bin/env python3

import requests
import json

def test_student_creation():
    url = "http://127.0.0.1:5002/api/admin/students"
    
    student_data = {
        "uid": "TEST001",
        "name": "Test Student",
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("🚀 Testing student creation...")
        print(f"URL: {url}")
        print(f"Data: {json.dumps(student_data, indent=2)}")
        
        response = requests.post(url, json=student_data, headers=headers)
        
        print(f"\n📊 Response:")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Body: {response.text}")
        
        if response.status_code == 201:
            print("✅ Student created successfully!")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")

if __name__ == "__main__":
    test_student_creation()
