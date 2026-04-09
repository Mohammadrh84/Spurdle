let cacheArtistID = null;
let cacheArtistName = null;
const listOfArtists = ["Taylor swift", "Ed Sheeran", "Adele", "Drake", "Beyoncé", "The Weeknd", "Billie Eilish", "Bruno Mars", "Ariana Grande", "Justin Bieber"];
let listOfSongs = [];
let cacheSongDeets = null;

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
        if (SongsInJSON[i].artistId === randomArtist) {
            listOfSongs.push(SongsInJSON[i]);
        }
    }
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
        return data.artists?.[0]?.strArtistThumb ?? "";
    } catch (err) {
        console.error("Failed to fetch artist image:", err);
        return "";
    }
}



document.addEventListener('DOMContentLoaded', async function() {
    try {
    const test = await GetRandomSong();
    console.log("Random song fetched on page load:", test);
    } catch (error) {
        console.error("Error occurred while fetching random song:", error);
}
});

async function GetRandomSong() {
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
        previewUrl: randomSong.previewUrl,
    };
    cacheSongDeets = songDeets;

    console.log("Random song details:", songDeets);
    document.getElementById('result').textContent = JSON.stringify(songDeets, null, 2);
    document.getElementById('artist-name').textContent = songDeets.artistName;

    GetArtistImage(randomArtistName).then(imageUrl => {
        document.getElementById('artist-image').src = imageUrl;
    });
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
    const container = document.getElementById('guess-feedback-container');
    const result = await isSongCorrect(userGuess);
    
    if (!userGuess) return;

    const p = document.createElement('p');
    
    p.classList.add("mt-1", "text-sm", "rounded-full", "py-2", "px-4");

    if (result) {
        p.textContent = "✓  " + userGuess;
        p.className = "mt-1 text-sm rounded-full py-2 px-4 text-neon-green bg-neon-green/5 border border-neon-green/20";
    } else {
        p.textContent = "✕  " + userGuess;
        p.className = "mt-1 text-sm rounded-full py-2 px-4 text-[#ff4a6e] border border-[#ff4a6e]/50 bg-[#ff4a6e1f]";
    }

    container.appendChild(p);
    document.getElementById('guess-input').value = "";
});