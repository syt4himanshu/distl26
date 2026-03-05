import logging
from main import app, db, User
from werkzeug.security import generate_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_admin_password():
    with app.app_context():
        logger.info("🔧 Fixing admin password...")
        
        # Find the admin user
        admin = User.query.filter_by(username="admin").first()
        if admin:
            # Generate a fresh password hash
            new_hash = generate_password_hash("admin123")
            admin.password_hash = new_hash
            db.session.commit()
            
            # Test the new password
            test_result = admin.check_password("admin123")
            logger.info(f"✅ Password updated for user: {admin.username}")
            logger.info(f"✅ Password test result: {test_result}")
            
            if test_result:
                logger.info("🎉 SUCCESS! Password fixed!")
                logger.info("👤 Username: admin")
                logger.info("🔑 Password: admin123")
            else:
                logger.info("❌ Still having password issues")
        else:
            logger.info("❌ Admin user not found!")

if __name__ == "__main__":
    fix_admin_password()
