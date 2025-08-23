from main import app, db, User
from werkzeug.security import generate_password_hash

def reset_admin():
    with app.app_context():
        print("Resetting admin user...")
        
        # Delete existing admin users
        deleted_count = User.query.filter_by(username="admin").delete()
        print(f"Deleted {deleted_count} existing admin users")
        
        # Create new admin
        admin_user = User(
            username="admin",
            role="admin", 
            password_hash=generate_password_hash("admin123")
        )
        db.session.add(admin_user)
        db.session.commit()
        
        # Verify the user was created
        check_user = User.query.filter_by(username="admin").first()
        if check_user:
            password_works = check_user.check_password("admin123")
            print(f"✅ Admin user created successfully!")
            print(f"✅ Username: admin")
            print(f"✅ Password: admin123")
            print(f"✅ Role: {check_user.role}")
            print(f"✅ Password verification: {password_works}")
        else:
            print("❌ Failed to create admin user")

if __name__ == "__main__":
    reset_admin()
