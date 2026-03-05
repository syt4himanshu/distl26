import os
import logging
from main import app, db, User
from werkzeug.security import generate_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db():
    with app.app_context():
        db.create_all()
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_password = os.getenv("ADMIN_PASSWORD", "asdfgh123")

        if not User.query.filter_by(role="admin").first():
            user = User(username=admin_username,
                        role="admin",
                        password_hash=generate_password_hash(admin_password))
            db.session.add(user)
            db.session.commit()
            logger.info(f"Admin user created: {admin_username} / {admin_password}")
        else:
            logger.info("Admin user already exists.")

if __name__ == "__main__":
    init_db()
