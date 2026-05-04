from flask import Flask
from flask_login import LoginManager

from .models import db, User
from .auth import auth
from .routes import bp


def create_app():
    app = Flask(__name__)

    app.config["SECRET_KEY"] = "dev-secret-key"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///game.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    # Register blueprint for main game routes
    app.register_blueprint(bp)

    # Register blueprint for login and signup routes
    app.register_blueprint(auth)

    with app.app_context():
        db.create_all()

    login_manager = LoginManager(app)

    # This must match the real auth route function name in auth.py
    login_manager.login_view = "auth.sign_in"

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    return app