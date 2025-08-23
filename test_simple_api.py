#!/usr/bin/env python3

import urllib.request
import urllib.parse
import json

def test_api():
    try:
        # Test basic connectivity
        print("🔍 Testing basic API connectivity...")
        req = urllib.request.Request("http://127.0.0.1:5002/api/users")
        with urllib.request.urlopen(req) as response:
            data = response.read()
            print(f"✅ Basic API works: {response.code}")
            print(f"Users response: {data.decode()[:100]}...")
        
        # Test student creation
        print("\n🚀 Testing student creation...")
        student_data = {
            "uid": "TEST001",
            "name": "Test Student",
            "email": "test@example.com",
            "password": "testpass123"
        }
        
        data = json.dumps(student_data).encode('utf-8')
        req = urllib.request.Request(
            "http://127.0.0.1:5002/api/admin/students",
            data=data,
            headers={
                'Content-Type': 'application/json',
            },
            method='POST'
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                result = response.read()
                print(f"✅ Student creation successful: {response.code}")
                print(f"Response: {result.decode()}")
        except urllib.error.HTTPError as e:
            error_data = e.read()
            print(f"❌ Student creation failed: {e.code}")
            print(f"Error: {error_data.decode()}")
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    test_api()
