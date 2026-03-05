import logging
from main import app, db, User
from werkzeug.security import generate_password_hash, check_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_admin():
    with app.app_context():
        logger.info("=== DATABASE DEBUG ===")
        
        # Check all users
        all_users = User.query.all()
        logger.info(f"Total users in database: {len(all_users)}")
        
        for user in all_users:
            logger.info(f"User: {user.username}, Role: {user.role}")
        
        # Find admin user
        admin_user = User.query.filter_by(username="admin").first()
        if admin_user:
            logger.info(f"\nAdmin user found: {admin_user.username}")
            logger.info(f"Admin role: {admin_user.role}")
            logger.info(f"Password hash exists: {bool(admin_user.password_hash)}")
            
            # Test password
            test_password = "admin123"
            password_valid = admin_user.check_password(test_password)
            logger.info(f"Password 'admin123' is valid: {password_valid}")
            
        else:
            logger.info("\nNo admin user found! Creating new one...")
            
            # Create fresh admin user
            new_admin = User(
                username="admin",
                role="admin",
                password_hash=generate_password_hash("admin123")
            )
            db.session.add(new_admin)
            db.session.commit()
            logger.info("New admin user created!")
            
        logger.info("\n=== TESTING PASSWORD MANUALLY ===")
        test_hash = generate_password_hash("admin123")
        logger.info(f"Test hash created: {test_hash[:50]}...")
        logger.info(f"Test verification: {check_password_hash(test_hash, 'admin123')}")

if __name__ == "__main__":
    debug_admin()
