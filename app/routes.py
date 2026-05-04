from flask import Blueprint, render_template, jsonify, request, redirect, url_for, session, flash
from flask_login import current_user, login_required

import json
import requests
import random

from .models import db, User, Game, Stats, SelectedArtist


bp = Blueprint('main', __name__)

FALLBACK_ARTIST_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
MAX_SELECTED_ARTISTS = 10


@bp.route('/')
def welcome():
    return render_template('welcome.html')


@bp.route('/main_game')
@login_required
def main_game():
    return render_template('main_game.html')


@bp.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')


def get_artist_image_from_itunes(artist_id):
    try:
        response = requests.get(
            "https://itunes.apple.com/lookup",
            params={
                "id": artist_id,
                "entity": "album",
                "limit": 1
            },
            timeout=6
        )

        data = response.json()

        for result in data.get("results", []):
            artwork_url = result.get("artworkUrl100")

            if artwork_url:
                return artwork_url.replace("100x100bb", "600x600bb")

    except (requests.RequestException, ValueError):
        pass

    return FALLBACK_ARTIST_IMAGE


def get_itunes_artist_id(artist_name, artist_id=None):
    if artist_id:
        return artist_id

    if not artist_name:
        return None

    try:
        response = requests.get(
            "https://itunes.apple.com/search",
            params={
                "term": artist_name,
                "entity": "musicArtist",
                "limit": 1
            },
            timeout=8
        )

        results = response.json().get("results", [])

        if len(results) == 0:
            return None

        return results[0].get("artistId")

    except (requests.RequestException, ValueError):
        return None


def clean_selected_artist(artist):
    if not isinstance(artist, dict):
        return None

    artist_id = str(artist.get("id", "")).strip()
    artist_name = str(artist.get("name", "")).strip()
    artist_image = str(artist.get("image", FALLBACK_ARTIST_IMAGE)).strip()

    if not artist_id or not artist_name:
        return None

    if not artist_image:
        artist_image = FALLBACK_ARTIST_IMAGE

    return {
        "id": artist_id,
        "name": artist_name,
        "image": artist_image
    }


def parse_selected_artists(raw_selected_artists):
    try:
        artists = json.loads(raw_selected_artists)
    except (TypeError, ValueError):
        return []

    if not isinstance(artists, list):
        return []

    selected_artists = []
    seen_artist_ids = set()

    for artist in artists:
        clean_artist = clean_selected_artist(artist)

        if clean_artist is None:
            continue

        if clean_artist["id"] in seen_artist_ids:
            continue

        selected_artists.append(clean_artist)
        seen_artist_ids.add(clean_artist["id"])

        if len(selected_artists) == MAX_SELECTED_ARTISTS:
            break

    return selected_artists


def get_saved_selected_artists_for_current_user():
    saved_artists = (
        SelectedArtist.query
        .filter_by(user_id=current_user.id)
        .order_by(SelectedArtist.id.asc())
        .all()
    )

    return [artist.to_dict() for artist in saved_artists]


def replace_saved_selected_artists_for_current_user(selected_artists):
    SelectedArtist.query.filter_by(user_id=current_user.id).delete()

    for artist in selected_artists:
        saved_artist = SelectedArtist(
            user_id=current_user.id,
            artist_id=artist["id"],
            artist_name=artist["name"],
            artist_image=artist["image"]
        )

        db.session.add(saved_artist)

    db.session.commit()


@bp.route('/api/search-artists')
def search_artists():
    search_term = request.args.get('term', '').strip()

    if len(search_term) == 0:
        return jsonify([])

    try:
        response = requests.get(
            "https://itunes.apple.com/search",
            params={
                "term": search_term,
                "entity": "musicArtist",
                "limit": 8
            },
            timeout=6
        )

        data = response.json()

    except (requests.RequestException, ValueError):
        return jsonify({"error": "Could not search artists."}), 500

    artists = []
    seen_artist_ids = set()

    for artist_data in data.get("results", []):
        artist_id = str(artist_data.get("artistId", "")).strip()
        artist_name = str(artist_data.get("artistName", "")).strip()

        if not artist_id or not artist_name:
            continue

        if artist_id in seen_artist_ids:
            continue

        artists.append({
            "id": artist_id,
            "name": artist_name,
            "image": FALLBACK_ARTIST_IMAGE
        })

        seen_artist_ids.add(artist_id)

    return jsonify(artists)


@bp.route('/api/artist-image-by-id')
def artist_image_by_id():
    artist_id = request.args.get('artist_id', '').strip()

    if not artist_id:
        return jsonify({"image": FALLBACK_ARTIST_IMAGE})

    return jsonify({
        "image": get_artist_image_from_itunes(artist_id)
    })


@bp.route('/select_artists', methods=['GET', 'POST'])
@login_required
def select_artists():
    selected_artists = get_saved_selected_artists_for_current_user()
    error_message = None

    if request.method == 'POST':
        form_action = request.form.get('form_action')

        if form_action == 'clear':
            SelectedArtist.query.filter_by(user_id=current_user.id).delete()
            db.session.commit()

            session.pop('selected_artists', None)

            flash("Selected artists cleared.", "neutral")
            return redirect(url_for('main.select_artists'))

        selected_artists = parse_selected_artists(
            request.form.get('selected_artists_json', '[]')
        )

        if len(selected_artists) == 0:
            error_message = "Please select at least one artist before saving."
        else:
            replace_saved_selected_artists_for_current_user(selected_artists)

            # Keep session copy temporarily so the current game flow still works.
            # Step 4C will update the API to load directly from the database.
            session['selected_artists'] = selected_artists

            flash("Selected artists saved.", "success")
            return redirect(url_for('main.select_artists'))

    return render_template(
        'select_artists.html',
        selected_artists=selected_artists,
        max_selected_artists=MAX_SELECTED_ARTISTS,
        error_message=error_message
    )


@bp.route('/api/selected-artists')
def get_selected_artists():
    return jsonify(session.get('selected_artists', []))


@bp.route('/api/songs')
def get_songs():
    artist_name = request.args.get('artist')
    artist_id = request.args.get('artist_id')

    artist_id = get_itunes_artist_id(artist_name, artist_id)

    if not artist_id:
        return jsonify([])

    try:
        response = requests.get(
            "https://itunes.apple.com/lookup",
            params={
                "id": artist_id,
                "entity": "song",
                "limit": 200
            },
            timeout=10
        )

        results = response.json().get('results', [])

    except (requests.RequestException, ValueError):
        return jsonify([])

    names = [
        song['trackName']
        for song in results
        if is_valid_song(song, artist_id)
    ]

    return jsonify(names)


@bp.route('/api/random-song')
def random_song():
    session['letters_correct'] = []
    session['letters_wrong'] = []
    session['current_points'] = 100
    session['num_guesses'] = 0

    artist_name = request.args.get('artist')
    artist_id = request.args.get('artist_id')

    artist_id = get_itunes_artist_id(artist_name, artist_id)

    if not artist_id:
        return jsonify({"error": "No artist found."}), 404

    try:
        response = requests.get(
            "https://itunes.apple.com/lookup",
            params={
                "id": artist_id,
                "entity": "song",
                "limit": 200
            },
            timeout=10
        )

        results = response.json().get('results', [])

    except (requests.RequestException, ValueError):
        return jsonify({"error": "Could not load songs."}), 500

    songs = []

    for song in results:
        if is_valid_song(song, artist_id):
            songs.append(song)

    if len(songs) == 0:
        return jsonify({"error": "No songs found for this artist."}), 404

    session['random_song_details'] = random.choice(songs)

    return jsonify(session['random_song_details'])


@bp.route('/api/song-details')
def song_details():
    argument = request.args.get('argument')
    return jsonify({
        "value": session.get('random_song_details', {}).get(argument)
    })


@bp.route('/api/artist-image')
def artist_image():
    artist = request.args.get('artist')

    image = ""
    genre = ""

    try:
        url = f"https://www.theaudiodb.com/api/v1/json/2/search.php?s={artist}"
        res = requests.get(url, timeout=6).json()

        if res.get("artists"):
            image = res["artists"][0].get("strArtistThumb", "")
            genre = res["artists"][0].get("strGenre", "")

    except (requests.RequestException, ValueError):
        pass

    return jsonify({
        "image": image,
        "genre": genre
    })


def is_valid_song(song, artist_id):
    return (
        song.get('wrapperType') == 'track'
        and str(song.get('artistId')) == str(artist_id)
        and "remix" not in song.get('trackName', '').lower()
    )


def filter_song_name(name):
    while '(' in name and ')' in name:
        start = name.find('(')
        end = name.find(')') + 1
        name = name[:start] + name[end:]

    while '[' in name and ']' in name:
        start = name.find('[')
        end = name.find(']') + 1
        name = name[:start] + name[end:]

    while '{' in name and '}' in name:
        start = name.find('{')
        end = name.find('}') + 1
        name = name[:start] + name[end:]

    while '  ' in name:
        name = name.replace('  ', ' ')

    return name.strip()


@bp.route('/api/check-letters')
def check_Letters():
    users_guess = request.args.get('user-guess', '')
    filtered_guess = users_guess.lower().replace(" ", "")

    song = session.get('random_song_details', {})
    filtered_song_name = filter_song_name(
        song.get('trackName', '').lower().replace(" ", "")
    )

    letters_correct = session.get('letters_correct', [])
    letters_wrong = session.get('letters_wrong', [])

    for letter in filtered_guess:
        if letter in filtered_song_name:
            if letter not in letters_correct:
                letters_correct.append(letter)
        else:
            if letter not in letters_wrong:
                letters_wrong.append(letter)

    session['letters_correct'] = letters_correct
    session['letters_wrong'] = letters_wrong

    return jsonify({
        "correct": letters_correct,
        "wrong": letters_wrong
    })


@bp.route('/api/current-letters')
def Send_current_letters():
    return jsonify({
        "correct": session.get('letters_correct', []),
        "wrong": session.get('letters_wrong', [])
    })


@bp.route('/api/points')
def calculate_points():
    current_points = session.get('current_points', 100)
    num_guesses = session.get('num_guesses', 0)

    user_guess = request.args.get('user-guess')
    song_name = request.args.get('song-name')
    type_of_points = int(request.args.get('type'))
    current_hint = int(request.args.get('current-hint'))

    if type_of_points == 0:
        current_points -= 3
    elif type_of_points == 1:
        if current_hint == 1:
            current_points -= 5
        elif current_hint == 2:
            current_points -= 10
        elif current_hint == 3:
            current_points -= 15
        elif current_hint == 4:
            current_points -= 10
        elif current_hint == 5:
            current_points -= 15

    num_guesses += 1

    session['current_points'] = current_points
    session['num_guesses'] = num_guesses

    if num_guesses <= 15 and user_guess == song_name and user_guess != "" and song_name != "":
        return jsonify({
            "CurrentPoints": current_points,
            "GameStatus": True,
            "GuessStatus": True
        })

    if current_points <= 0:
        return jsonify({
            "CurrentPoints": current_points,
            "GameStatus": True,
            "GuessStatus": False
        })

    return jsonify({
        "CurrentPoints": current_points,
        "GuessStatus": False
    })


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def calculate_current_streak(user_id):
    games = (
        Game.query
        .filter_by(user_id=user_id)
        .order_by(Game.id.desc())
        .all()
    )

    streak = 0

    for game in games:
        if game.correct:
            streak += 1
        else:
            break

    return streak


@bp.route('/api/save-score', methods=['POST'])
def save_score():
    if not current_user.is_authenticated:
        return jsonify({
            "error": "You must be logged in to save a score."
        }), 401

    data = request.get_json() or {}

    client_score = safe_int(data.get('score'), 0)
    hints = safe_int(data.get('hints'), 0)
    guesses = safe_int(data.get('guesses'), 0)
    correct = bool(data.get('correct', False))

    server_points = safe_int(session.get('current_points'), 0)

    score = client_score

    if score > server_points:
        score = server_points

    if score < 0:
        score = 0

    if hints < 0:
        hints = 0

    if guesses < 0:
        guesses = 0

    game = Game(
        user_id=current_user.id,
        score=score,
        hints=hints,
        guesses=guesses,
        correct=correct
    )

    db.session.add(game)

    stats = Stats.query.filter_by(user_id=current_user.id).first()

    if stats is None:
        stats = Stats(
            user_id=current_user.id,
            total_points=0,
            accuracy=0,
            games_played=0,
            avg_hints=0
        )
        db.session.add(stats)

    old_games_played = stats.games_played or 0
    old_correct_games = round((stats.accuracy or 0) * old_games_played)

    new_games_played = old_games_played + 1
    new_correct_games = old_correct_games + (1 if correct else 0)

    stats.total_points = (stats.total_points or 0) + score
    stats.games_played = new_games_played
    stats.accuracy = new_correct_games / new_games_played
    stats.avg_hints = (((stats.avg_hints or 0) * old_games_played) + hints) / new_games_played

    db.session.commit()

    return jsonify({
        "message": "Score saved successfully.",
        "score": score,
        "total_points": stats.total_points,
        "games_played": stats.games_played,
        "accuracy": round(stats.accuracy * 100, 1),
        "avg_hints": round(stats.avg_hints, 1),
        "streak": calculate_current_streak(current_user.id)
    })


@bp.route('/api/leaderboard')
def leaderboard_data():
    rows = (
        db.session.query(User, Stats)
        .join(Stats, User.id == Stats.user_id)
        .order_by(Stats.total_points.desc())
        .all()
    )

    leaderboard = []

    for user, stats in rows:
        leaderboard.append({
            "name": user.username,
            "points": stats.total_points or 0,
            "streak": calculate_current_streak(user.id),
            "accuracy": round((stats.accuracy or 0) * 100, 1),
            "games": stats.games_played or 0,
            "avgHints": round(stats.avg_hints or 0, 1)
        })

    return jsonify(leaderboard)


@bp.route('/api/reset')
def reset_game():
    session['current_points'] = 100
    session['num_guesses'] = 0
    session['letters_correct'] = []
    session['letters_wrong'] = []

    return jsonify({
        "message": "Game reset successfully"
    })