from flask import Blueprint, render_template, jsonify, request, redirect, url_for, session, flash
import json
import requests
import random

bp = Blueprint('main', __name__)

FALLBACK_ARTIST_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
MAX_SELECTED_ARTISTS = 10


@bp.route('/')
def welcome():
    return render_template('welcome.html')

@bp.route('/main_game')
def main_game():
    return render_template('main_game.html')

@bp.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')

# retrieving album cover images when searching for artists
def get_artist_image_from_itunes(artist_id):
    try:
        response = requests.get("https://itunes.apple.com/lookup", params={"id": artist_id, "entity": "album", "limit": 1}, timeout=6)
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
        response = requests.get("https://itunes.apple.com/search", params={"term": artist_name, "entity": "musicArtist", "limit": 1}, timeout=8)
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
    return {"id": artist_id, "name": artist_name, "image": artist_image}


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


@bp.route('/api/search-artists')
def search_artists():
    search_term = request.args.get('term', '').strip()
    if len(search_term) == 0:
        return jsonify([])
    try:
        response = requests.get("https://itunes.apple.com/search", params={"term": search_term, "entity": "musicArtist", "limit": 8}, timeout=6)
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
        artists.append({"id": artist_id, "name": artist_name, "image": FALLBACK_ARTIST_IMAGE})
        seen_artist_ids.add(artist_id)
    return jsonify(artists)


@bp.route('/api/artist-image-by-id')
def artist_image_by_id():
    artist_id = request.args.get('artist_id', '').strip()
    if not artist_id:
        return jsonify({"image": FALLBACK_ARTIST_IMAGE})
    return jsonify({"image": get_artist_image_from_itunes(artist_id)})


@bp.route('/select_artists', methods=['GET', 'POST'])
def select_artists():
    selected_artists = session.get('selected_artists', [])
    error_message = None
    if request.method == 'POST':
        form_action = request.form.get('form_action')
        if form_action == 'clear':
            session.pop('selected_artists', None)
            flash("Selected artists cleared.", "neutral")
            return redirect(url_for('main.select_artists'))
        selected_artists = parse_selected_artists(request.form.get('selected_artists_json', '[]'))
        if len(selected_artists) == 0:
            error_message = "Please select at least one artist before saving."
        else:
            session['selected_artists'] = selected_artists
            flash("Selected artists saved.", "success")
            return redirect(url_for('main.select_artists'))
    return render_template('select_artists.html', selected_artists=selected_artists, max_selected_artists=MAX_SELECTED_ARTISTS, error_message=error_message)


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
        response = requests.get("https://itunes.apple.com/lookup", params={"id": artist_id, "entity": "song", "limit": 200}, timeout=10)
        results = response.json().get('results', [])
    except (requests.RequestException, ValueError):
        return jsonify([])
    names = [song['trackName'] for song in results if is_valid_song(song, artist_id)]
    return jsonify(names)


@bp.route('/api/random-song')
def random_song():
    # reset session state for new game
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
        response = requests.get("https://itunes.apple.com/lookup", params={"id": artist_id, "entity": "song", "limit": 200}, timeout=10)
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
    return jsonify({"value": session.get('random_song_details', {}).get(argument)})


@bp.route('/api/artist-image')
def artist_image():
    artist = request.args.get('artist')
    url = f"https://www.theaudiodb.com/api/v1/json/2/search.php?s={artist}"
    res = requests.get(url).json()
    image = ""
    if res.get("artists"):
        image = res["artists"][0].get("strArtistThumb", "")
        genre = res["artists"][0].get("strGenre", "")
    return jsonify({"image": image,
                    "genre": genre})


def is_valid_song(song, artist_id):
    return (
        song.get('wrapperType') == 'track'
        and str(song.get('artistId')) == str(artist_id)
        ## avoid remixes in the pool of songs as they complicate things 
        and "remix" not in song.get('trackName', '').lower()
    )

def filter_song_name(name):
    # filter out any text in brackets e.g (feat. Rick Ross) or empty area
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
    # normalise guess to match same format as filtered names
    filtered_guess = users_guess.lower().replace(" ", "")

    song = session.get('random_song_details', {})
    filtered_song_name = filter_song_name(song.get('trackName', '').lower().replace(" ", ""))

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

    return jsonify({"correct": letters_correct, "wrong": letters_wrong})


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
        return jsonify({"CurrentPoints": current_points, "GameStatus": True, "GuessStatus": True})

    if current_points <= 0:
        return jsonify({"CurrentPoints": current_points, "GameStatus": True, "GuessStatus": False})

    return jsonify({"CurrentPoints": current_points, "GuessStatus": False})


@bp.route('/api/reset')
def reset_game():
    session['current_points'] = 100
    session['num_guesses'] = 0
    session['letters_correct'] = []
    session['letters_wrong'] = []
    return jsonify({"message": "Game reset successfully"})