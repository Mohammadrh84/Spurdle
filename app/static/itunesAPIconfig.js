let cacheArtistName = "Taylor Swift";
let cacheArtistId = null;
let selectedArtists = [];

let listOfSongNames = [];
let snippetStartTime = 0;

let cacheArtistImage = null;

let cachedReleaseDate = null;
let cachedAlbumCover = null;
let cachedAlbumName = null;
let cachedIsSingle = false;
let cachedPreviewUrl = null;

const FALLBACK_ARTIST = {
    id: "159260351",
    name: "Taylor Swift",
    image: "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
};

const FALLBACK_ARTIST_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

/*
On page load, resets server session, loads the user's artists, picks one at random, then starts the game
*/
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await fetch('/api/reset');
        await loadSelectedArtists();
        chooseRandomArtist();
        await GetRandomSong();
    } catch (error) {
        console.error("Error occurred while fetching random song:", error);
    }
});

/*
Fetches the users saved artist list from the server and stores it in an array
*/
async function loadSelectedArtists() {
    try {
        const response = await fetch('/api/selected-artists');
        const data = await response.json();

        if (Array.isArray(data)) {
            selectedArtists = data;
        } else {
            selectedArtists = [];
        }
    } catch (error) {
        console.error("Could not load selected artists:", error);
        selectedArtists = [];
    }
}

/*
Selects a random artist from the saved list and caches their details
*/
function chooseRandomArtist() {
    if (!selectedArtists || selectedArtists.length === 0) {
        cacheArtistName = FALLBACK_ARTIST.name;
        cacheArtistId = FALLBACK_ARTIST.id;
        cacheArtistImage = FALLBACK_ARTIST.image;
        return;
    }

    const randomArtist = selectedArtists[Math.floor(Math.random() * selectedArtists.length)];

    cacheArtistName = randomArtist.name || FALLBACK_ARTIST.name;
    cacheArtistId = randomArtist.id || null;
    cacheArtistImage = randomArtist.image || FALLBACK_ARTIST_IMAGE;
}

/*
Builds a query string with the an artist's id and name.
*/
function getArtistParams() {
    const params = new URLSearchParams();

    if (cacheArtistId) {
        params.set('artist_id', cacheArtistId);
    }

    params.set('artist', cacheArtistName);

    return params.toString();
}


function setTextIfElementExists(elementId, text) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = text;
    }
}


function setImageIfElementExists(elementId, imageUrl) {
    const element = document.getElementById(elementId);

    if (element) {
        element.src = imageUrl || FALLBACK_ARTIST_IMAGE;
    }
}

/*
Updates the album name hint
If the album is a single the text is changed and is printed in red.
*/
function setAlbumNameHint(albumName, isSingle = false) {
    const element = document.getElementById('album-name');
    if (!element) return;

    element.textContent = albumName || "Unknown album";

    if (isSingle) {
        element.classList.add('text-[#ff4a6e]');
        element.classList.remove('text-neon-green');
    } else {
        element.classList.add('text-neon-green');
        element.classList.remove('text-[#ff4a6e]');
    }
}

/*
Fetches the track count for a given iTunes collection (album) which is used to determine whether the chosen song is a single or not.
*/
async function getAlbumTrackCount(collectionID) {
    if (!collectionID) {
        return 0;
    }

    try {
        const response = await fetch(`/api/album-track-count?collection_id=${collectionID}`);
        const data = await response.json();

        return data.trackCount || 0;
    } catch (error) {
        console.error("Could not get album track count", error);
        return 0;
    }
}


/*
Fetches a random song for the current artist and populates all visible hint fields (album cover, album name, release date, artist image).
Also loads the song name list for autocomplete suggestions. 
Displays a warning if the artist has fewer than 10 songs to indicate no points will be awarded.
*/
async function GetRandomSong() {
    gameRegistered = false;
    const res = await fetch('/api/random-song?' + getArtistParams());
    const songDeets = await res.json();

    if (songDeets.error) {
        console.error(songDeets.error);
        return;
    }

    cachedPreviewUrl = songDeets.previewUrl || null;
    cachedAlbumCover = songDeets.artworkUrl100 || null;
    cachedAlbumName = songDeets.collectionName || "Unknown album";
    cachedIsSingle = songDeets.trackCount === 1 || cachedAlbumName.toLowerCase().includes("single");

    if (songDeets.releaseDate) {
        cachedReleaseDate = new Date(songDeets.releaseDate).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    } else {
        cachedReleaseDate = "Unknown release date";
    }

    setTextIfElementExists('artist-name', cacheArtistName);
    listOfSongNames = songDeets.songNames || [];

    if (songDeets.pointsDisabled) {
        const container = document.getElementById('small-artist-warning');
        const p = document.createElement('p');
        p.textContent = "This artist has less than 10 songs. To maintain fairness, songs from this artist will not award points!";
        p.className = "mt-1 text-sm rounded-full py-2 px-4 text-[#ff4a6e] border border-[#ff4a6e]/50 bg-[#ff4a6e1f]";
        container.appendChild(p);
    }

    if (!cacheArtistImage || cacheArtistImage === FALLBACK_ARTIST_IMAGE) {
        try {
            const imgRes = await fetch('/api/artist-image?artist=' + encodeURIComponent(cacheArtistName));
            const imgData = await imgRes.json();
            if (imgData.image) cacheArtistImage = imgData.image;
        } catch (error) {
            console.error("Could not load artist image:", error);
        }
    }

    setImageIfElementExists('artist-image', cacheArtistImage);
}

/*
Strips parentheses, brackets, and braces from a song name for loose comparison.
For example "Blinding Lights (Official Video)" becomes "Blinding Lights".
*/
function filterSongName(name) {
    return name
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\{.*?\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}


let currentGuess = 0;

/*
Checks whether the player's guess matches the current song.
Sends the guess to the server to update points and determine game status.
Triggers finishGame() if the game should end (correct guess or points hit zero).
Returns true if the guess was correct.
*/
async function isSongCorrect(Guess) {
    const { value } = await fetch('/api/song-details?argument=trackName').then(r => r.json());

    if (!value) {
        return false;
    }

    const filteredSong = filterSongName(value).toLowerCase();
    const filteredGuess = filterSongName(Guess).toLowerCase();

    currentGuess++;

    const params = new URLSearchParams({
        'user-guess': filteredGuess,
        'song-name': filteredSong,
        'type': 0,
        'current-hint': 0
    });

    const { GuessStatus, CurrentPoints, GameStatus } = await fetch(`/api/points?${params}`).then(r => r.json());

    setTextIfElementExists('current-points', CurrentPoints);

    if (GameStatus) {
        await finishGame(GuessStatus, CurrentPoints);
        return GuessStatus;
    }

    return GuessStatus;
}

/*
Handles what happens when the user presses the guess button and updates the letter reveal hint 
*/
document.getElementById('guess-button').addEventListener('click', async function() {
    const userGuess = document.getElementById('guess-input').value;

    if (!userGuess) {
        return;
    }

    const container = document.getElementById('guess-feedback-container');
    await registerGame();
    const result = await isSongCorrect(userGuess);

    await checkLetters();

    const p = document.createElement('p');

    if (result) {
        p.textContent = "✓  " + userGuess;
        p.className = "mt-1 text-sm rounded-full py-2 px-4 text-neon-green bg-neon-green/5 border border-neon-green/20";
    } else {
        p.textContent = "✕  " + userGuess;
        p.className = "mt-1 text-sm rounded-full py-2 px-4 text-[#ff4a6e] border border-[#ff4a6e]/50 bg-[#ff4a6e1f]";
    }

    container.prepend(p);
    document.getElementById('guess-input').value = "";
});

/*
Allows for a user to submit their guess by pressing enter.
*/
document.getElementById('guess-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        document.getElementById('guess-button').click();
    }
});


const hintSections = [
    { hidden: document.getElementById('section-1-hidden'), hint: document.getElementById('section-1-hint') },
    { hidden: document.getElementById('section-2-hidden'), hint: document.getElementById('section-2-hint') },
    { hidden: document.getElementById('section-3-hidden'), hint: document.getElementById('section-3-hint') },
    { hidden: document.getElementById('section-4-hidden'), hint: document.getElementById('section-4-hint') },
    { hidden: document.getElementById('section-5-hidden'), hint: document.getElementById('section-5-hint') },
];

let currentHint = 0;

/*
Reveals the next hint section and deducts points on the server. Hint 3 specifically also triggers the letter colouring.
*/
async function NextHint() {
    if (currentHint >= 5) return;

    await registerGame();

    const params = new URLSearchParams({
        'user-guess': "",
        'song-name': "",
        'type': 1,
        'current-hint': currentHint + 1
    });

    const { CurrentPoints } = await fetch(`/api/points?${params}`).then(r => r.json());

    hintSections[currentHint].hidden.classList.add('hidden');
    hintSections[currentHint].hint.classList.remove('hidden');

    currentHint++;

    setTextIfElementExists('hints-revealed', `${currentHint} / 5 Revealed`);
    setTextIfElementExists('current-points', CurrentPoints);

    if (currentHint === 1) {
        setTextIfElementExists('release-date', cachedReleaseDate);
    } else if (currentHint === 2) {
        setImageIfElementExists('album-cover', cachedAlbumCover);
    } else if (currentHint === 3) {
        UpdateLettersHint();
    } else if (currentHint === 4) {
        if (cachedIsSingle) {
            setAlbumNameHint("This song is a single", true);
        } else {
            setAlbumNameHint(cachedAlbumName, false);
        }
    }
}

/**
Sends the current guess to the server to check which letters are in the song name.
Updates the on-screen letter colours if hint 3 has been revealed.
*/
async function checkLetters() {
    const userGuess = document.getElementById('guess-input').value;

    if (!userGuess) {
        return;
    }

    await fetch('/api/check-letters?user-guess=' + encodeURIComponent(userGuess)).then(r => r.json());

    if (currentHint >= 3) {
        UpdateLettersHint();
    }
}

/*
Fetches the current correct and wrong letter lists from the server and colours the on-screen letters for hint 3 accordingly.
Green = letter is in the song name, red = letter is not.
*/
async function UpdateLettersHint() {
    const { correct, wrong } = await fetch('/api/current-letters').then(r => r.json());

    for (let i = 0; i < correct.length; i++) {
        const letterElement = document.getElementById(`letter-${correct[i].toUpperCase()}`);

        if (!letterElement) {
            continue;
        }

        letterElement.classList.remove('text-white/80');
        letterElement.classList.add('text-neon-green');
    }

    for (let i = 0; i < wrong.length; i++) {
        const letterElement = document.getElementById(`letter-${wrong[i].toUpperCase()}`);

        if (!letterElement) {
            continue;
        }

        letterElement.classList.remove('text-white/80');
        letterElement.classList.add('text-[#ff4a6e]');
    }
}

/*
Plays a random 2 second audio snippet of the current song starting from snippetStartTime.
*/
async function playSnippet() {
    if (currentHint < 5 || !cachedPreviewUrl) {
        return;
    }

    const audio = new Audio(cachedPreviewUrl);
    audio.currentTime = snippetStartTime;
    audio.play();

    setTimeout(() => {
        audio.pause();
    }, 2000);
}

/*
Ends the current round, saves the score, shows the results overlay, and resets the server session for the next round.
Score is only awarded if the guess was correct.
*/
async function finishGame(correct, currentPoints) {
    const scoreToSave = correct ? currentPoints : 0;
    const savedStats = await saveScoreToDatabase(scoreToSave, correct);

    await showResultsOverlay(correct, scoreToSave, savedStats);
    await fetch('/api/reset');
}

/* 
Registers the game and ends it as a loss with zero points. 
*/
async function giveUpGame() {
    await registerGame();
    await finishGame(false, 0);
}

/*
Reads the CSRF token from the page's meta tag for use in POST request headers. 
*/
function getCsrfToken() {
    const csrfMetaTag = document.querySelector('meta[name="csrf-token"]');

    if (!csrfMetaTag) {
        return "";
    }

    return csrfMetaTag.getAttribute("content");
}

/*
Sends the round's final score, hint count, guess count, and result to the server.
Returns the updated stats object on success, or null if the save fails.
*/
async function saveScoreToDatabase(score, correct) {
    try {
        const response = await fetch('/api/save-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({
                score: score,
                hints: currentHint,
                guesses: currentGuess,
                correct: correct
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn("Score was not saved:", data.error);
            return null;
        }

        console.log("Score saved:", data);
        return data;
    } catch (error) {
        console.error("Error saving score:", error);
        return null;
    }
}

/**
Populates and displays the results overlay. Shows the song name, artist, score earned, and updated total points of the user.
Title and subtitle change depending on whether the guess was correct or not.
*/
async function showResultsOverlay(results, score, savedStats) {
    const overlay = document.getElementById('result-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySubTitle = document.getElementById('overlay-subtitle');

    setImageIfElementExists('artist-image-result', cacheArtistImage);
    setTextIfElementExists('artist-name-results', cacheArtistName);

    const { value } = await fetch('/api/song-details?argument=trackName').then(r => r.json());

    setTextIfElementExists('song-name-results', value || "Unknown song");
    setTextIfElementExists('your-score', score);

    if (savedStats && savedStats.total_points !== undefined) {
        setTextIfElementExists('total-points', savedStats.total_points);
    } else {
        setTextIfElementExists('total-points', "Not saved");
    }

    if (results) {
        overlayTitle.textContent = "You did it!";
        overlaySubTitle.textContent = "Your score has been saved to the leaderboard.";
    } else {
        overlayTitle.textContent = "Oops! Don't worry, you can't win them all.";
        overlaySubTitle.textContent = "Your attempt has been saved. Try again!";
    }

    overlay.classList.remove('hidden');
}

/*
Hides the results overlay and reloads the page to start a fresh round.
*/
async function playAgain() {
    document.getElementById('result-overlay').classList.add('hidden');
    location.reload();
}

/*
updates the suggested artists as the user types and shows matching suggestions in a dropdown.
Clicking a suggestion fills the input box and clicking outside dismisses the dropdown.
*/
document.addEventListener('DOMContentLoaded', function() {
    const guessInput = document.getElementById('guess-input');
    const suggestionsList = document.getElementById('suggestions-list');

    guessInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();

        suggestionsList.innerHTML = '';

        if (!query) {
            suggestionsList.classList.add('hidden');
            return;
        }

        const matches = listOfSongNames.filter(song => song.toLowerCase().includes(query));

        if (matches.length > 0) {
            suggestionsList.classList.remove('hidden');

            matches.forEach(match => {
                const li = document.createElement('li');

                li.textContent = match;
                li.className = "px-4 py-3 text-sm text-white/80 hover:bg-neon-green/10 hover:text-neon-green cursor-pointer border-b border-white/5 last:border-0";

                li.addEventListener('click', function() {
                    guessInput.value = match;
                    suggestionsList.classList.add('hidden');
                });

                suggestionsList.appendChild(li);
            });
        } else {
            suggestionsList.classList.add('hidden');
        }
    });

    document.addEventListener('mousedown', function(event) {
        if (!guessInput.contains(event.target) && !suggestionsList.contains(event.target)) {
            suggestionsList.classList.add('hidden');
        }
    });
});

let gameRegistered = false;

/*
Registers the current round on the server the first time the player takes an action (user makes a guess or uses a hint). 
*/
async function registerGame() {
    if (gameRegistered) return;
    gameRegistered = true;

    await fetch('/api/register-game', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() }
    });
}