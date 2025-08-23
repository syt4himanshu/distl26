from main import app, db, User
from werkzeug.security import generate_password_hash, check_password_hash

def debug_admin():
    with app.app_context():
        print("=== DATABASE DEBUG ===")
        
        # Check all users
        all_users = User.query.all()
        print(f"Total users in database: {len(all_users)}")
        
        for user in all_users:
            print(f"User: {user.username}, Role: {user.role}")
        
        # Find admin user
        admin_user = User.query.filter_by(username="admin").first()
        if admin_user:
            print(f"\nAdmin user found: {admin_user.username}")
            print(f"Admin role: {admin_user.role}")
            print(f"Password hash exists: {bool(admin_user.password_hash)}")
            
            # Test password
            test_password = "admin123"
            password_valid = admin_user.check_password(test_password)
            print(f"Password 'admin123' is valid: {password_valid}")
            
        else:
            print("\nNo admin user found! Creating new one...")
            
            # Create fresh admin user
            new_admin = User(
                username="admin",
                role="admin",
                password_hash=generate_password_hash("admin123")
            )
            db.session.add(new_admin)
            db.session.commit()
            print("New admin user created!")
            
        print("\n=== TESTING PASSWORD MANUALLY ===")
        test_hash = generate_password_hash("admin123")
        print(f"Test hash created: {test_hash[:50]}...")
        print(f"Test verification: {check_password_hash(test_hash, 'admin123')}")

if __name__ == "__main__":
    debug_admin()
