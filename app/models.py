from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    # connect each user to all their game records
    games = db.relationship('Game', backref='user', lazy=True)


class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # corresponding user
    score = db.Column(db.Integer, default=0) # how many points were awarded
    hints = db.Column(db.Integer, default=0) # how many hints were used?
    guesses = db.Column(db.Integer, default=0) # how many guessses they made
    correct = db.Column(db.Boolean) # whether they correctly guessed the song in that game


class Stats(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True)
    total_points = db.Column(db.Integer, default=0) # add to this value after each game
    accuracy = db.Column(db.Float, default=0) # what is accuracy based on? 
    games_played = db.Column(db.Integer, default=0) # increment by 1 for each game record
    avg_hints = db.Column(db.Float, default=0) # will be calculating by a running average