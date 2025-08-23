from main import app, db, User
from werkzeug.security import generate_password_hash

def fix_admin_password():
    with app.app_context():
        print("🔧 Fixing admin password...")
        
        # Find the admin user
        admin = User.query.filter_by(username="admin").first()
        if admin:
            # Generate a fresh password hash
            new_hash = generate_password_hash("admin123")
            admin.password_hash = new_hash
            db.session.commit()
            
            # Test the new password
            test_result = admin.check_password("admin123")
            print(f"✅ Password updated for user: {admin.username}")
            print(f"✅ Password test result: {test_result}")
            
            if test_result:
                print("🎉 SUCCESS! Password fixed!")
                print("👤 Username: admin")
                print("🔑 Password: admin123")
            else:
                print("❌ Still having password issues")
        else:
            print("❌ Admin user not found!")

if __name__ == "__main__":
    fix_admin_password()
