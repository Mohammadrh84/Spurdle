let cacheArtistName = "Taylor Swift";
let cacheArtistId = null;
let selectedArtists = [];

let listOfSongNames = [];
let snippetStartTime = 0;

let cacheArtistImage = null;

const FALLBACK_ARTIST = {
    id: "159260351",
    name: "Taylor Swift",
    image: "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
};

const FALLBACK_ARTIST_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";


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


async function GetRandomSong() {
    const res = await fetch('/api/random-song?' + getArtistParams());
    const songDeets = await res.json();

    if (songDeets.error) {
        console.error(songDeets.error);
        return;
    }

    setTextIfElementExists('artist-name', cacheArtistName);

    const [artwork, albumName, releaseDate] = await Promise.all([
        fetch('/api/song-details?argument=artworkUrl100').then(r => r.json()),
        fetch('/api/song-details?argument=collectionName').then(r => r.json()),
        fetch('/api/song-details?argument=releaseDate').then(r => r.json())
    ]);

    setImageIfElementExists('album-cover', artwork.value);
    setTextIfElementExists('album-name', albumName.value || "Unknown album");

    if (releaseDate.value) {
        const formattedDate = new Date(releaseDate.value).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        setTextIfElementExists('release-date', formattedDate);
    } else {
        setTextIfElementExists('release-date', "Unknown release date");
    }

    if (!cacheArtistImage || cacheArtistImage === FALLBACK_ARTIST_IMAGE) {
        try {
            const imgRes = await fetch('/api/artist-image?artist=' + encodeURIComponent(cacheArtistName));
            const imgData = await imgRes.json();

            if (imgData.image) {
                cacheArtistImage = imgData.image;
            }
        } catch (error) {
            console.error("Could not load artist image:", error);
        }
    }

    setImageIfElementExists('artist-image', cacheArtistImage);

    const songsRes = await fetch('/api/songs?' + getArtistParams());
    const songsData = await songsRes.json();

    if (Array.isArray(songsData)) {
        listOfSongNames = songsData;
    } else {
        listOfSongNames = [];
    }
}


function filterSongName(name) {
    return name
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\{.*?\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}


let currentGuess = 0;


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
        const scoreToSave = GuessStatus ? CurrentPoints : 0;
        const savedStats = await saveScoreToDatabase(scoreToSave, GuessStatus);

        await showResultsOverlay(GuessStatus, scoreToSave, savedStats);
        await fetch('/api/reset');

        return GuessStatus;
    }

    return GuessStatus;
}


document.getElementById('guess-button').addEventListener('click', async function() {
    const userGuess = document.getElementById('guess-input').value;

    if (!userGuess) {
        return;
    }

    const container = document.getElementById('guess-feedback-container');
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


async function NextHint() {
    if (currentHint >= 5) {
        return;
    }

    hintSections[currentHint].hidden.classList.add('hidden');
    hintSections[currentHint].hint.classList.remove('hidden');

    currentHint++;

    setTextIfElementExists('hints-revealed', `${currentHint} / 5 Revealed`);

    if (currentHint === 3) {
        UpdateLettersHint();
    }

    const params = new URLSearchParams({
        'user-guess': "",
        'song-name': "",
        'type': 1,
        'current-hint': currentHint
    });

    const { CurrentPoints } = await fetch(`/api/points?${params}`).then(r => r.json());

    setTextIfElementExists('current-points', CurrentPoints);
}


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


async function playSnippet() {
    const { value } = await fetch('/api/song-details?argument=previewUrl').then(r => r.json());

    if (!value) {
        return;
    }

    const audio = new Audio(value);

    audio.currentTime = snippetStartTime;
    audio.play();

    setTimeout(() => {
        audio.pause();
    }, 2000);
}


async function saveScoreToDatabase(score, correct) {
    try {
        const response = await fetch('/api/save-score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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


async function playAgain() {
    document.getElementById('result-overlay').classList.add('hidden');
    location.reload();
}


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