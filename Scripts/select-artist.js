// --- Global Variables ---
const searchResults = document.getElementById("searchResults");
const selectedArtists = document.getElementById("selectedArtists");
const artistSearch = document.getElementById("artistSearch");
const startButton = document.getElementById("startButton");

const chosenArtists = [];

// --- Debounce ---
function debounce(func, timeout = 400) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// --- Fetch Image ---
async function GetArtistImageFromApple(artistId) {
    try {
        const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=1`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 1) {
            const albumData = data.results[1];
            if (albumData.artworkUrl100) {
                return albumData.artworkUrl100.replace('100x100bb', '600x600bb');
            }
        }

        return "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
    } catch {
        return "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
    }
}

// --- Search API ---
async function searchArtistsFromAPI(query) {
    if (!query) {
        searchResults.innerHTML = "";
        return;
    }

    searchResults.innerHTML = `<p class="text-white/60 text-lg text-center py-4">Searching...</p>`;

    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=5`);
        const data = await response.json();

        if (data.results.length === 0) {
            searchResults.innerHTML = `<p class="text-white/60 text-lg">No artists found.</p>`;
            return;
        }

        renderSearchResults(data.results);

    } catch {
        searchResults.innerHTML = `<p class="text-red-400 text-lg">Error searching artists.</p>`;
    }
}

// --- Render Search Results ---
function renderSearchResults(results) {
    searchResults.innerHTML = "";

    results.forEach(artistData => {
        const artist = {
            id: artistData.artistId,
            name: artistData.artistName,
            image: "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"
        };

        const alreadySelected = chosenArtists.some(a => a.id === artist.id);

        const card = document.createElement("div");
        card.className = `bg-white/15 text-white rounded-3xl p-4 flex items-center justify-between gap-4 border border-white/10 ${
            alreadySelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'
        }`;

        const imgId = `img-${artist.id}`;

        card.innerHTML = `
          <div class="flex items-center gap-4">
            <img id="${imgId}" src="${artist.image}" class="w-16 h-16 rounded-2xl object-cover">
            <span class="text-2xl font-bold">${artist.name}</span>
          </div>
          <span class="text-lg font-semibold ${alreadySelected ? "text-neon-green" : "text-white/60"}">
            ${alreadySelected ? "Selected" : "Add"}
          </span>
        `;

        if (!alreadySelected) {
            card.addEventListener("click", async () => {
                const realImage = await GetArtistImageFromApple(artist.id);
                artist.image = realImage;

                addArtist(artist);

                artistSearch.value = "";
                searchResults.innerHTML = "";
            });
        }

        searchResults.appendChild(card);

        GetArtistImageFromApple(artist.id).then(url => {
            const img = document.getElementById(imgId);
            if (img) img.src = url;
        });
    });
}

// --- Selected Artists ---
function renderSelectedArtists() {
    selectedArtists.innerHTML = "";

    if (chosenArtists.length === 0) {
        selectedArtists.innerHTML = `<p class="text-white/60 text-lg">No artists selected yet.</p>`;
        return;
    }

    chosenArtists.forEach((artist, index) => {
        const card = document.createElement("div");
        card.className = "bg-white text-black rounded-3xl p-4 flex items-center justify-between";

        card.innerHTML = `
          <div class="flex items-center gap-4">
            <img src="${artist.image}" class="w-14 h-14 rounded-2xl object-cover">
            <span class="text-xl font-bold">${artist.name}</span>
          </div>
          <button class="bg-black text-white px-3 py-1 rounded-full">×</button>
        `;

        card.querySelector("button").onclick = () => {
            chosenArtists.splice(index, 1);
            renderSelectedArtists();
            updateStartButton();
        };

        selectedArtists.appendChild(card);
    });
}

// --- Add Artist ---
function addArtist(artist) {
    chosenArtists.push(artist);
    renderSelectedArtists();
    updateStartButton();
}

// --- Start Button ---
function updateStartButton() {
    if (chosenArtists.length === 0) {
        startButton.disabled = true;
        startButton.className = "mt-8 w-64 rounded-full bg-white/40 text-black/60 py-3 font-bold block mx-auto";
    } else {
        startButton.disabled = false;
        startButton.className = "mt-8 w-64 rounded-full bg-white text-black py-3 font-bold block mx-auto";
    }
}

// --- Event ---
artistSearch.addEventListener("input", debounce(e => {
    searchArtistsFromAPI(e.target.value.trim());
}, 400));

// --- Init ---
renderSelectedArtists();
updateStartButton();