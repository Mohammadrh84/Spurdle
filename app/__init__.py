from flask import Flask
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_migrate import Migrate

from .config import Config
from .models import db, User
from .auth import auth
from .routes import bp


csrf = CSRFProtect()
migrate = Migrate()


def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)

    db.init_app(app)
    csrf.init_app(app)
    migrate.init_app(app, db)

    # Register blueprint for main game routes
    app.register_blueprint(bp)

    # Register blueprint for login and signup routes
    app.register_blueprint(auth)

    login_manager = LoginManager(app)
    login_manager.login_view = "auth.sign_in"

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    return app