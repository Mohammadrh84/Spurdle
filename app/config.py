import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get("SPURDLE_SECRET_KEY")

    SQLALCHEMY_DATABASE_URI = os.environ.get("SPURDLE_DATABASE_URL")

    SQLALCHEMY_TRACK_MODIFICATIONS = False