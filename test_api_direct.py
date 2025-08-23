import json
import urllib.request
import urllib.parse

def test_login():
    url = "http://127.0.0.1:5002/api/auth/login"
    
    # Test data - exactly what frontend sends
    test_data = {
        "uid": "admin",
        "password": "admin123"
    }
    
    print("Testing login with:")
    print(f"URL: {url}")
    print(f"Data: {test_data}")
    print("-" * 50)
    
    try:
        # Prepare the request
        data = json.dumps(test_data).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        req.add_header('Content-Type', 'application/json')
        
        # Make the request
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            print(f"SUCCESS! Status: {response.status}")
            print(f"Response: {result}")
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"HTTP ERROR {e.code}: {e.reason}")
        print(f"Error body: {error_body}")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_login()
