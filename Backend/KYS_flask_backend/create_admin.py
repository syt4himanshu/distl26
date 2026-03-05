import sys
import os
import logging
sys.path.append(os.path.dirname(__file__))

from main import app, db, User
from werkzeug.security import generate_password_hash, check_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

with app.app_context():
    logger.info("🗑️  Deleting all existing admin users...")
    User.query.filter_by(username="admin").delete()
    db.session.commit()
    
    logger.info("👤 Creating fresh admin user...")
    password = "admin123"
    password_hash = generate_password_hash(password)
    
    logger.info(f"Generated hash: {password_hash}")
    logger.info(f"Hash verification test: {check_password_hash(password_hash, password)}")
    
    admin = User(
        username="admin",
        role="admin",
        password_hash=password_hash
    )
    
    db.session.add(admin)
    db.session.commit()
    
    logger.info("✅ Admin user created!")
    
    # Verify it works
    fresh_admin = User.query.filter_by(username="admin").first()
    if fresh_admin:
        test_result = fresh_admin.check_password("admin123")
        logger.info(f"🔐 Password verification: {test_result}")
        logger.info(f"📋 Username: admin")
        logger.info(f"🔑 Password: admin123")
        logger.info(f"👑 Role: {fresh_admin.role}")
        
        if test_result:
            logger.info("🎉 SUCCESS! You can now login with admin/admin123")
        else:
            logger.info("❌ Something is still wrong with password verification")
    else:
        logger.info("❌ Failed to create admin user")
