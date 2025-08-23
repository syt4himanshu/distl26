import requests
import json

BASE_URL = "http://localhost:5002"

def test_student_login_and_form():
    """Test student login and form submission"""
    
    # Test login with a sample student
    print("🔑 Testing student login...")
    login_data = {
        "username": "21ce001",
        "password": "student123"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print(f"Login response: {response.status_code}")
    
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return
    
    login_result = response.json()
    token = login_result.get("access_token")
    print(f"✅ Login successful! Token: {token[:20]}...")
    
    # Test getting student profile
    print("\n📋 Testing get student profile...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/student/me", headers=headers)
    print(f"Get profile response: {response.status_code}")
    
    if response.status_code == 200:
        profile = response.json()
        print(f"✅ Profile loaded: {profile.get('full_name')} (UID: {profile.get('uid')})")
        if profile.get('personal_info'):
            print(f"   Has personal info: {profile['personal_info'].get('mobile_no', 'No mobile')}")
        else:
            print("   No personal info yet")
    else:
        print(f"❌ Failed to get profile: {response.text}")
        return
    
    # Test updating student profile
    print("\n💾 Testing student profile update...")
    update_data = {
        "semester": 6,
        "section": "A",
        "personal_info": {
            "mobile_no": "+91 9876543210",
            "personal_email": "test.student@gmail.com",
            "college_email": "21ce001@college.edu",
            "linked_in_id": "linkedin.com/in/teststudent",
            "permanent_address": "123 Test Street, Test City - 123456",
            "dob": "2002-01-15",
            "gender": "Male",
            "father_name": "Test Father",
            "father_mobile_no": "+91 9876543211",
            "father_email": "father@test.com",
            "father_occupation": "Engineer",
            "mother_name": "Test Mother",
            "mother_mobile_no": "+91 9876543212",
            "mother_email": "mother@test.com",
            "mother_occupation": "Teacher"
        },
        "past_education_records": [
            {
                "degree": "SSC",
                "percentage": 92.5,
                "year_of_passing": 2018
            },
            {
                "degree": "HSSC", 
                "percentage": 88.0,
                "year_of_passing": 2020
            }
        ],
        "career_objective": {
            "career_objective": "To become a successful software engineer",
            "domain_of_interest": "Web Development, Machine Learning",
            "additional_skills": "Cloud Computing, DevOps",
            "expectations": "Industry exposure and hands-on training"
        },
        "projects": [
            {
                "title": "Student Management System",
                "description": "Web-based application for managing student records",
                "guide": "Prof. John Doe"
            }
        ]
    }
    
    response = requests.put(f"{BASE_URL}/student/me", headers=headers, json=update_data)
    print(f"Update response: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ Profile updated successfully!")
        
        # Verify the update by fetching profile again
        response = requests.get(f"{BASE_URL}/student/me", headers=headers)
        if response.status_code == 200:
            updated_profile = response.json()
            print(f"✅ Verification: Profile has personal info: {updated_profile.get('personal_info') is not None}")
            if updated_profile.get('personal_info'):
                print(f"   Mobile: {updated_profile['personal_info'].get('mobile_no')}")
                print(f"   Email: {updated_profile['personal_info'].get('personal_email')}")
            if updated_profile.get('career_objective'):
                print(f"   Career objective: {updated_profile['career_objective'].get('career_objective')}")
    else:
        print(f"❌ Update failed: {response.text}")

if __name__ == "__main__":
    try:
        test_student_login_and_form()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
