import sys
import os
sys.path.append(os.path.dirname(__file__))

from main import app, db, User
from werkzeug.security import generate_password_hash, check_password_hash

with app.app_context():
    print("🗑️  Deleting all existing admin users...")
    User.query.filter_by(username="admin").delete()
    db.session.commit()
    
    print("👤 Creating fresh admin user...")
    password = "admin123"
    password_hash = generate_password_hash(password)
    
    print(f"Generated hash: {password_hash}")
    print(f"Hash verification test: {check_password_hash(password_hash, password)}")
    
    admin = User(
        username="admin",
        role="admin",
        password_hash=password_hash
    )
    
    db.session.add(admin)
    db.session.commit()
    
    print("✅ Admin user created!")
    
    # Verify it works
    fresh_admin = User.query.filter_by(username="admin").first()
    if fresh_admin:
        test_result = fresh_admin.check_password("admin123")
        print(f"🔐 Password verification: {test_result}")
        print(f"📋 Username: admin")
        print(f"🔑 Password: admin123")
        print(f"👑 Role: {fresh_admin.role}")
        
        if test_result:
            print("🎉 SUCCESS! You can now login with admin/admin123")
        else:
            print("❌ Something is still wrong with password verification")
    else:
        print("❌ Failed to create admin user")
