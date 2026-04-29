from flask import Flask, render_template, jsonify, request, redirect, url_for, session
import requests
import random

letters_correct = set()
letters_wrong = set()
random_song_details = {}

from app import app


@app.route('/')
def home():
    return render_template('main-game.html')


def get_selectable_artists():
    return [
        {
            "id": "taylor-swift",
            "name": "Taylor Swift",
            "genre": "Pop",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "ed-sheeran",
            "name": "Ed Sheeran",
            "genre": "Pop",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "adele",
            "name": "Adele",
            "genre": "Pop/Soul",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "drake",
            "name": "Drake",
            "genre": "Hip-Hop",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "the-weeknd",
            "name": "The Weeknd",
            "genre": "R&B/Pop",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "billie-eilish",
            "name": "Billie Eilish",
            "genre": "Alternative",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "bruno-mars",
            "name": "Bruno Mars",
            "genre": "Pop/Funk",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "ariana-grande",
            "name": "Ariana Grande",
            "genre": "Pop",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "justin-bieber",
            "name": "Justin Bieber",
            "genre": "Pop",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        },
        {
            "id": "beyonce",
            "name": "Beyoncé",
            "genre": "R&B/Pop",
            "image": "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        }
    ]


@app.route('/select-artists', methods=['GET', 'POST'])
def select_artists():
    artists = get_selectable_artists()
    valid_artist_ids = [artist["id"] for artist in artists]

    selected_artist_ids = session.get('selected_artists', [])
    error_message = None
    saved = request.args.get('saved') == '1'

    if request.method == 'POST':
        selected_artist_ids = request.form.getlist('artists')

        selected_artist_ids = [
            artist_id for artist_id in selected_artist_ids
            if artist_id in valid_artist_ids
        ]

        selected_artist_ids = selected_artist_ids[:10]

        if len(selected_artist_ids) == 0:
            error_message = "Please select at least one artist before saving."
            saved = False
        else:
            session['selected_artists'] = selected_artist_ids
            return redirect(url_for('select_artists', saved='1'))

    return render_template(
        'select-artists.html',
        artists=artists,
        selected_artist_ids=selected_artist_ids,
        saved=saved,
        error_message=error_message
    )


@app.route('/api/songs')
def get_songs():
    artist_name = request.args.get('artist')

    search_url = f"https://itunes.apple.com/search?term={artist_name}&entity=musicArtist&limit=1"
    artist_id = requests.get(search_url).json()['results'][0]['artistId']

    songs_url = f"https://itunes.apple.com/lookup?id={artist_id}&entity=song&limit=200"
    results = requests.get(songs_url).json()['results']

    names = [
        s['trackName']
        for s in results
        if s.get('wrapperType') == 'track' and s.get('artistId') == artist_id
    ]

    return jsonify(names)


@app.route('/api/random-song')
def random_song():
    global random_song_details

    letters_correct.clear()
    letters_wrong.clear()

    artist_name = request.args.get('artist')

    search_url = f"https://itunes.apple.com/search?term={artist_name}&entity=musicArtist&limit=1"
    artist_res = requests.get(search_url).json()
    artist_id = artist_res['results'][0]['artistId']

    songs_url = f"https://itunes.apple.com/lookup?id={artist_id}&entity=song&limit=200"
    songs_res = requests.get(songs_url).json()

    songs = [
        s for s in songs_res['results']
        if s.get('wrapperType') == 'track' and s.get('artistId') == artist_id
    ]

    random_song_details = random.choice(songs)

    return jsonify(random_song_details)


@app.route('/api/song-details')
def song_details():
    argument = request.args.get('argument')
    return jsonify({"value": random_song_details.get(argument)})


@app.route('/api/artist-image')
def artist_image():
    artist = request.args.get('artist')

    url = f"https://www.theaudiodb.com/api/v1/json/2/search.php?s={artist}"
    res = requests.get(url).json()

    image = ""

    if res.get("artists"):
        image = res["artists"][0].get("strArtistThumb", "")

    return jsonify({"image": image})


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


@app.route('/api/check-letters')
def check_Letters():
    users_guess = request.args.get('user-guess')
    filtered_guess = users_guess.lower().replace(" ", "")

    filtered_song_name = random_song_details['trackName'].lower().replace(" ", "")
    filtered_song_name = filter_song_name(filtered_song_name)

    for letter in filtered_guess:
        if letter in filtered_song_name:
            letters_correct.add(letter)
        else:
            letters_wrong.add(letter)

    return jsonify({
        "correct": list(letters_correct),
        "wrong": list(letters_wrong)
    })


@app.route('/api/current-letters')
def Send_current_letters():
    return jsonify({
        "correct": list(letters_correct),
        "wrong": list(letters_wrong)
    })


current_points = 100
num_guesses = 0


@app.route('/api/points')
def calculate_points():
    global current_points
    global num_guesses

    user_guess = request.args.get('user-guess')
    song_name = request.args.get('song-name')
    type_of_points = int(request.args.get('type'))
    current_hint = int(request.args.get('current-hint'))

    print(f"{user_guess} {song_name}")

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


@app.route('/api/reset')
def reset_game():
    global current_points

    current_points = 100
    letters_correct.clear()
    letters_wrong.clear()

    return jsonify({"message": "Game reset successfully"})


if __name__ == '__main__':
    app.run(debug=True)