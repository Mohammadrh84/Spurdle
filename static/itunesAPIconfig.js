let cacheArtistName = "Taylor Swift"; 
let listOfSongNames = [];
let snippetStartTime = 0; // will be randomised in the future

let cacheArtistImage = null;


document.addEventListener('DOMContentLoaded', async function() {
    try {
        await fetch('/api/reset');
        await GetRandomSong();
    } catch (error) {
        console.error("Error occurred while fetching random song:", error);
}
});

async function GetRandomSong() {
    const res = await fetch('/api/random-song?artist=' + encodeURIComponent(cacheArtistName));
    const songDeets = await res.json();

    document.getElementById('artist-name').textContent = cacheArtistName;

    

    const [artwork, albumName, releaseDate] = await Promise.all([
        fetch('/api/song-details?argument=artworkUrl100').then(r => r.json()),
        fetch('/api/song-details?argument=collectionName').then(r => r.json()),
        fetch('/api/song-details?argument=releaseDate').then(r => r.json())
    ]);

    document.getElementById('album-cover').src = artwork.value;
    document.getElementById('album-name').textContent = albumName.value;
    document.getElementById('release-date').textContent = new Date(releaseDate.value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });


    
    
    // fetch artist image from Flask
    const imgRes = await fetch(`/api/artist-image?artist=` + encodeURIComponent(cacheArtistName));
    const imgData = await imgRes.json();
    document.getElementById('artist-image').src = imgData.image;
    cacheArtistImage = imgData.image;

    const songsRes = await fetch('/api/songs?artist=' + encodeURIComponent(cacheArtistName));
    listOfSongNames = await songsRes.json();
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
    document.getElementById('current-points').textContent = CurrentPoints;
    if (GameStatus) {
        document.getElementById('your-score').textContent = CurrentPoints;
        document.getElementById('total-points').textContent = "test";
        showResultsOverlay();
        await fetch('/api/reset');
        return GuessStatus;
    } 
    return GuessStatus;
}

document.getElementById('guess-button').addEventListener('click', async function() {
    const userGuess = document.getElementById('guess-input').value;
    if (!userGuess) return;
    
    const container = document.getElementById('guess-feedback-container');
    const result = await isSongCorrect(userGuess);
    
    await checkLetters();

    const p = document.createElement('p');
    
    p.classList.add("mt-1", "text-sm", "rounded-full", "py-2", "px-4");

    if (result) {
        p.textContent = "✓  " + userGuess;
        p.className = "mt-1 text-sm rounded-full py-2 px-4 text-neon-green bg-neon-green/5 border border-neon-green/20";
        showResultsOverlay(true);
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
    if (currentHint >= 5) return;
    hintSections[currentHint].hidden.classList.add('hidden');
    hintSections[currentHint].hint.classList.remove('hidden');
    currentHint++;
    document.getElementById('hints-revealed').textContent = `${currentHint} / 5 Revealed`;
    if (currentHint === 3) {
        UpdateLettersHint();
    }

    const params = new URLSearchParams({
        'user-guess': "",
        'song-name': "",
        'type': 1,
        'current-hint': currentHint
    });

    const { GuessStatus, CurrentPoints } = await fetch(`/api/points?${params}`).then(r => r.json());
    document.getElementById('current-points').textContent = CurrentPoints;
}

async function checkLetters() {
    const userGuess = document.getElementById('guess-input').value;
    if (!userGuess) return;

    const { correct, wrong } = await fetch('/api/check-letters?user-guess=' + encodeURIComponent(userGuess)).then(r => r.json());

    if (currentHint >= 3) {
        UpdateLettersHint();
    }
}
async function UpdateLettersHint() {
    const { correct, wrong } = await fetch('/api/current-letters').then(r => r.json());

    for (let i = 0; i < correct.length; i++) {
        const letterElement = document.getElementById(`letter-${correct[i].toUpperCase()}`);
        if (!letterElement) continue;
        letterElement.classList.remove('text-white/80');
        letterElement.classList.add('text-neon-green');
    }
    for (let i = 0; i < wrong.length; i++) {
        const letterElement = document.getElementById(`letter-${wrong[i].toUpperCase()}`);
        if (!letterElement) continue;
        letterElement.classList.remove('text-white/80');
        letterElement.classList.add('text-[#ff4a6e]');
    }
}


async function playSnippet() {
    const { value } = await fetch('/api/song-details?argument=previewUrl').then(r => r.json());
    const audio = new Audio(value);

    audio.currentTime = snippetStartTime;
    audio.play();

    setTimeout(() => {
        audio.pause();
    }, 2000);
}

async function showResultsOverlay(results) {

    const overlay = document.getElementById('result-overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlaySubTitle = document.getElementById('overlay-subtitle');
    
    document.getElementById('artist-image-result').src = cacheArtistImage;
    document.getElementById('artist-name-results').textContent = cacheArtistName;
    const { value } = await fetch('/api/song-details?argument=trackName').then(r => r.json());
    document.getElementById('song-name-results').textContent = value;
    if (results) {
        overlayTitle.textContent = "You did it!";
        overlaySubTitle.textContent = "Play again and see if you can get a streak going!";
    } else {
        overlayTitle.textContent = "Oops! Dont worry you cant win them all.";
        overlaySubTitle.textContent = "Try again, you got the next one!";
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

    // check for input and conver to lowercase
    guessInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        suggestionsList.innerHTML = ''; // Clear previous

        // if there is no input do not show the dropdown
        if (!query) {
            suggestionsList.classList.add('hidden');
            return;
        }

        // filter the list based on what user has typed, not case sensitive
        const matches = listOfSongNames.filter(song => song.toLowerCase().includes(query));

        // if there are any matches display them
        if (matches.length > 0) {
            suggestionsList.classList.remove('hidden');
            
            matches.forEach(match => {
                const li = document.createElement('li');
                li.textContent = match;
                li.className = "px-4 py-3 text-sm text-white/80 hover:bg-neon-green/10 hover:text-neon-green cursor-pointer border-b border-white/5 last:border-0";
                
                // when match is clicked enter the exact text in the input box so user can press guess
                li.addEventListener('click', function() {
                    guessInput.value = match;
                    suggestionsList.classList.add('hidden');
                });
                
                suggestionsList.appendChild(li);
            });
        } else {
            // if there are no matches, hide the list
            suggestionsList.classList.add('hidden');
        }
    });

    document.addEventListener('mousedown', function(event) {
        if (!guessInput.contains(event.target) && !suggestionsList.contains(event.target)) {
            suggestionsList.classList.add('hidden');
        }
    });
});