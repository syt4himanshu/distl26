print("🚀 Starting API test...")

try:
    import urllib.request
    import json
    print("📚 Imports successful")
    
    url = "http://127.0.0.1:5002/api/test"
    print(f"🔍 Testing URL: {url}")
    
    req = urllib.request.Request(url)
    print("📝 Request created")
    
    with urllib.request.urlopen(req) as response:
        print(f"📊 Response status: {response.code}")
        data = response.read()
        print(f"📄 Raw response: {data}")
        
        result = json.loads(data)
        print(f"✅ Parsed response: {result}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    print("📋 Full traceback:")
    traceback.print_exc()

print("🏁 Test completed")
