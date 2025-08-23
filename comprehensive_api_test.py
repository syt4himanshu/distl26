#!/usr/bin/env python3

import urllib.request
import urllib.parse
import json
import sys

def test_api_step_by_step():
    base_url = "http://127.0.0.1:5002"
    
    print("🔍 Testing API Step by Step")
    print("=" * 50)
    
    # Step 1: Test basic connectivity
    try:
        print("1️⃣ Testing basic API connectivity...")
        req = urllib.request.Request(f"{base_url}/api/test")
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            print(f"   ✅ API is running: {data['message']}")
    except Exception as e:
        print(f"   ❌ API connectivity failed: {str(e)}")
        return
    
    # Step 2: Test login (need admin credentials)
    print("\n2️⃣ Testing admin login...")
    
    # Try to get users first to see what admin accounts exist
    try:
        req = urllib.request.Request(f"{base_url}/api/users")
        with urllib.request.urlopen(req) as response:
            users_data = json.loads(response.read())
            print(f"   📊 Found {len(users_data)} users")
            admin_users = [u for u in users_data if u.get('role') == 'admin']
            print(f"   👤 Admin users: {[u['username'] for u in admin_users]}")
            
            if admin_users:
                admin_username = admin_users[0]['username']
                print(f"   🎯 Will try to login as: {admin_username}")
    except Exception as e:
        print(f"   ⚠️ Could not fetch users: {str(e)}")
        admin_username = "admin"  # Default guess
    
    # Try login with common admin credentials
    login_attempts = [
        ("admin", "admin123"),
        ("admin", "admin"),
        ("admin", "password"),
        ("admin123", "admin123")
    ]
    
    token = None
    for username, password in login_attempts:
        try:
            login_data = {
                "username": username,
                "password": password
            }
            data = json.dumps(login_data).encode('utf-8')
            req = urllib.request.Request(
                f"{base_url}/api/auth/login",
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read())
                token = result.get('access_token')
                print(f"   ✅ Login successful with {username}/{password}")
                print(f"   🔑 Got token: {token[:20]}..." if token else "   ⚠️ No token received")
                break
        except urllib.error.HTTPError as e:
            error_data = e.read().decode()
            print(f"   ❌ Login failed for {username}/{password}: {e.code} - {error_data}")
        except Exception as e:
            print(f"   ❌ Login error for {username}/{password}: {str(e)}")
    
    if not token:
        print("\n❌ Could not authenticate. Cannot test student creation.")
        print("\n💡 To fix this, you need to:")
        print("   1. Make sure there's an admin account in the database")
        print("   2. Know the admin username and password")
        print("   3. Or create an admin account using create_admin.py script")
        return
    
    # Step 3: Test student creation
    print(f"\n3️⃣ Testing student creation with authentication...")
    
    student_data = {
        "uid": "TEST001",
        "firstName": "Test",
        "lastName": "Student",
        "semester": 1,
        "section": "A",
        "year": 2024,
        "password": "test123"
    }
    
    try:
        data = json.dumps(student_data).encode('utf-8')
        req = urllib.request.Request(
            f"{base_url}/api/admin/students",
            data=data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read())
            print(f"   ✅ Student creation successful!")
            print(f"   📋 Response: {json.dumps(result, indent=2)}")
            
    except urllib.error.HTTPError as e:
        error_data = e.read().decode()
        print(f"   ❌ Student creation failed: {e.code}")
        print(f"   📄 Error details: {error_data}")
    except Exception as e:
        print(f"   ❌ Student creation error: {str(e)}")
    
    print(f"\n✅ Test completed!")

if __name__ == "__main__":
    test_api_step_by_step()
