let cacheArtistID = null;
let cacheArtistName = null;
const savedArtists = JSON.parse(localStorage.getItem("selectedArtists")) || [];
let listOfArtists = [];
for (let i = 0; i < savedArtists.length; i++) {
    listOfArtists.push(savedArtists[i].name);}

if (listOfArtists.length === 0) {
        window.location.href = "./select-artist.html";}
let listOfSongNames = [];
let cacheSongDeets = null;
let lettersInSong = [];
let lettersCorrect = [];
let lettersWrong = [];
let snippetStartTime = 0;
let cacheArtistImage = null;

async function GetArtistIdName(artistName) {
    const searchForArtistUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=1`;
    const waitingForArtist = await fetch(searchForArtistUrl);
    const artistData = await waitingForArtist.json();
    const artistDetails = artistData.results[0];
    cacheArtistID = artistDetails.artistId;
    return artistDetails.artistId;
}

async function filterSongs(SongsInJSON, randomArtist) {
    for (let i = 0; i < SongsInJSON.length; i++) {
        if (SongsInJSON[i].artistId === randomArtist && SongsInJSON[i].wrapperType === "track") {
            listOfSongs.push(SongsInJSON[i]);
            listOfSongNames.push(SongsInJSON[i].trackName);
        }
    }
    console.log(listOfSongs);
}
async function GetArtistSongs(randomArtist) {
    const searchArtistsSongsUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(randomArtist)}&entity=song&limit=200`;
    const waitingForSongs = await fetch(searchArtistsSongsUrl);
    const songsData = await waitingForSongs.json();
    const songsInJSON = songsData.results;

    listOfSongs = [];

    await filterSongs(songsInJSON, randomArtist);
}

async function GetArtistImage(randomArtistName) {
    try {
        const url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(randomArtistName)}`;
        const res = await fetch(url);
        const data = await res.json();
        cacheArtistImage = data.artists?.[0]?.strArtistThumb ?? "";
        return data.artists?.[0]?.strArtistThumb ?? "";
    } catch (err) {
        console.error("Failed to fetch artist image:", err);
        return "";
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    try {
        await GetRandomSong();
    } catch (error) {
        console.error("Error occurred while fetching random song:", error);
}
});

async function GetRandomSong(TryAgainNumber = 5) {
    try {
        const randomArtistName = listOfArtists[Math.floor(Math.random() * listOfArtists.length)];
        cacheArtistName = randomArtistName;
        const randomArtistId = await GetArtistIdName(randomArtistName);
        await GetArtistSongs(randomArtistId);
        const randomSong = listOfSongs[Math.floor(Math.random() * listOfSongs.length)];

        const songDeets = {
            artistName: randomSong.artistName,
            albumName: randomSong.collectionName,
            trackName: randomSong.trackName,
            releaseDate: randomSong.releaseDate,
            genre: randomSong.primaryGenreName,
            SongPreview: randomSong.previewUrl,
            AlbumCover: randomSong.artworkUrl100,
        };
        cacheSongDeets = songDeets;
        snippetStartTime = Math.floor(Math.random() * (28));
        document.getElementById('artist-name').textContent = songDeets.artistName;

        //HINTS
        document.getElementById('release-date').textContent = new Date(songDeets.releaseDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        document.getElementById('album-cover').src = songDeets.AlbumCover;
        document.getElementById('album-name').textContent = songDeets.albumName;

        GetArtistImage(randomArtistName).then(imageUrl => {
            document.getElementById('artist-image').src = imageUrl;
        });

        for (let i = 0; i < songDeets.trackName.length; i++) {
            lettersInSong.push(songDeets.trackName[i].toLowerCase());
        }
    } catch (error) {
        if (TryAgainNumber > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return GetRandomSong(TryAgainNumber - 1);
        }
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

async function isSongCorrect(Guess) {
    const filteredSong = filterSongName(cacheSongDeets.trackName).toLowerCase();
    const filteredGuess = filterSongName(Guess).toLowerCase();

    return filteredGuess === filteredSong;
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

function NextHint() {
    if (currentHint >= 5) return;
    hintSections[currentHint].hidden.classList.add('hidden');
    hintSections[currentHint].hint.classList.remove('hidden');
    currentHint++;
    document.getElementById('hints-revealed').textContent = `${currentHint} / 5 Revealed`;
}

async function checkLetters() {
    const userGuess = document.getElementById('guess-input').value;
    if (!userGuess) return;

    const filteredSong = filterSongName(cacheSongDeets.trackName).toLowerCase();
    const filteredGuess = filterSongName(userGuess).toLowerCase();


    for (let i = 0; i < filteredGuess.length; i++) {
        const letterElement = document.getElementById(`letter-${filteredGuess[i].toUpperCase()}`);
        if (!letterElement) continue;
        if (lettersCorrect.includes(filteredGuess[i]) || lettersWrong.includes(filteredGuess[i])) {
            continue;
        } else {
            if (lettersInSong.includes(filteredGuess[i])) {
                lettersCorrect.push(filteredGuess[i]);
                letterElement.classList.remove('text-white/80');
                letterElement.classList.add('text-neon-green');
            } else {
                lettersWrong.push(filteredGuess[i]);
                letterElement.classList.remove('text-white/80');
                letterElement.classList.add('text-[#ff4a6e]');
            }
        }
    }
}

async function playSnippet() {
    const audio = new Audio(cacheSongDeets.SongPreview);
    
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
    document.getElementById('song-name-results').textContent = cacheSongDeets.trackName;
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

    // if user clicks outside the dropdown hide it
    document.addEventListener('click', function(event) {
        if (!guessInput.contains(event.target) && !suggestionsList.contains(event.target)) {
            suggestionsList.classList.add('hidden');
        }
    });
});