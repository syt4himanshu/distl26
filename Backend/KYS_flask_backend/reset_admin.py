import logging
from main import app, db, User
from werkzeug.security import generate_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_admin():
    with app.app_context():
        logger.info("Resetting admin user...")
        
        # Delete existing admin users
        deleted_count = User.query.filter_by(username="admin").delete()
        logger.info(f"Deleted {deleted_count} existing admin users")
        
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
            logger.info(f"✅ Admin user created successfully!")
            logger.info(f"✅ Username: admin")
            logger.info(f"✅ Password: admin123")
            logger.info(f"✅ Role: {check_user.role}")
            logger.info(f"✅ Password verification: {password_works}")
        else:
            logger.info("❌ Failed to create admin user")

if __name__ == "__main__":
    reset_admin()
