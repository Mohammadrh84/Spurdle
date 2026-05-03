from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

    # Connect each user to their game records
    games = db.relationship('Game', backref='user', lazy=True)

    # Connect each user to their saved selected artists
    selected_artists = db.relationship(
        'SelectedArtist',
        backref='user',
        lazy=True,
        cascade='all, delete-orphan'
    )


class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    # Corresponding user
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # How many points were awarded
    score = db.Column(db.Integer, default=0)

    # How many hints were used
    hints = db.Column(db.Integer, default=0)

    # How many guesses they made
    guesses = db.Column(db.Integer, default=0)

    # Whether they correctly guessed the song in that game
    correct = db.Column(db.Boolean, default=False)


class Stats(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True)

    # Add to this value after each game
    total_points = db.Column(db.Integer, default=0)

    # Stored as decimal, e.g. 0.75 means 75%
    accuracy = db.Column(db.Float, default=0)

    # Increment by 1 for each game record
    games_played = db.Column(db.Integer, default=0)

    # Running average of hints used
    avg_hints = db.Column(db.Float, default=0)


class SelectedArtist(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # iTunes artist ID
    artist_id = db.Column(db.String(50), nullable=False)

    # Artist display name
    artist_name = db.Column(db.String(150), nullable=False)

    # Artist image URL
    artist_image = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        db.UniqueConstraint(
            'user_id',
            'artist_id',
            name='unique_user_selected_artist'
        ),
    )

    def to_dict(self):
        return {
            "id": self.artist_id,
            "name": self.artist_name,
            "image": self.artist_image
        }