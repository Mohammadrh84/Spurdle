// --- Global Variables ---
const searchResults = document.getElementById("searchResults");
const selectedArtists = document.getElementById("selectedArtists");
const artistSearch = document.getElementById("artistSearch");
const startButton = document.getElementById("startButton");

const chosenArtists = [];

// 'debounce' function to avoid spamming the API when refreshing search results
function debounce(func, timeout = 400) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

async function GetArtistImageFromApple(artistId) {
    try {
        // just had to change entity=song to album to search for albums
        const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.results && data.results.length > 1) {
            // API returns results as a list with album details as the second item
            const albumData = data.results[1]; 
            
            if (albumData.artworkUrl100) {
                const highResImage = albumData.artworkUrl100.replace('100x100bb', '600x600bb');
                return highResImage;
            }
        }
        // if none upload placeholder image, we should replace this with our own custom one
        return "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
    } catch (err) {
        console.error("Failed to fetch image from Apple:", err);
        return "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
    }
}

async function searchArtistsFromAPI(query) {
    if (!query) {
        // clear ui if nothing is queried / query is empty
        searchResults.innerHTML = "";
        return;
    }

    searchResults.innerHTML = `<p class="text-white/60 text-lg text-center py-4">Searching...</p>`;

    try {
        // always fetches up to 5 artists from the apple API
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=5`);
        // convert response to json
        const data = await response.json();
        const results = data.results;

        if (results.length === 0) {
            searchResults.innerHTML = `<p class="text-white/60 text-lg">No artists found.</p>`;
            return;
        }

        renderSearchResults(results);

    } catch (error) {
        console.error("API Error:", error);
        searchResults.innerHTML = `<p class="text-red-400 text-lg">Error searching artists.</p>`;
    }
}

function renderSearchResults(results) {
    // refresh results
    searchResults.innerHTML = "";

    results.forEach(artistData => {
        // only store information that we need from the API
        const artist = {
            id: artistData.artistId,
            name: artistData.artistName,
            image: "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png" // Placeholder
        };

        // variable for artists already chosen
        const alreadySelected = chosenArtists.some(c => c.id === artist.id);

        const card = document.createElement("div");
        // make already chosen artists appear differently in the search
        card.className = `bg-white text-black rounded-3xl p-4 flex items-center justify-between gap-4 ${alreadySelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01] transition-transform duration-200'}`;
        
        const imgId = `img-search-${artist.id}`;

        card.innerHTML = `
          <div class="flex items-center gap-4">
            <img id="${imgId}" src="${artist.image}" alt="${artist.name}" class="w-16 h-16 rounded-2xl object-cover bg-gray-200">
            <span class="text-3xl font-bold">${artist.name}</span>
          </div>
          <span class="text-sm font-semibold ${alreadySelected ? "text-neon-green" : "text-black/60"}">
            ${alreadySelected ? "Selected" : "Add"}
          </span>
        `;

        if (!alreadySelected) {
            card.addEventListener("click", async () => {
                card.querySelector("span.text-sm").textContent = "Loading...";
                
                const actualImage = await GetArtistImageFromApple(artist.id);
                artist.image = actualImage;
                
                addArtist(artist);
                
                artistSearch.value = "";
                searchResults.innerHTML = "";
            });
        }

        searchResults.appendChild(card);

        GetArtistImageFromApple(artist.id).then(imgUrl => {
            const imgElement = document.getElementById(imgId);
            if (imgElement) imgElement.src = imgUrl;
        });
    });
}

function renderSelectedArtists() {
    selectedArtists.innerHTML = "";

    if (chosenArtists.length === 0) {
        selectedArtists.innerHTML = `<p class="text-white/60 text-lg">No artists selected yet.</p>`;
        return;
    }

    chosenArtists.forEach((artist, index) => {
        const card = document.createElement("div");
        card.className = "bg-white text-black rounded-3xl p-4 flex items-center justify-between gap-4";

        card.innerHTML = `
          <div class="flex items-center gap-4">
            <img src="${artist.image}" alt="${artist.name}" class="w-14 h-14 rounded-2xl object-cover bg-gray-200">
            <span class="text-2xl font-bold">${artist.name}</span>
          </div>
          <button class="text-xl font-bold px-3 py-1 rounded-full bg-black text-white hover:scale-105 transition-transform duration-200">
            ×
          </button>
        `;

        // logic for removing artists
        card.querySelector("button").addEventListener("click", () => {
            chosenArtists.splice(index, 1);
            renderSelectedArtists();
            updateStartButton();
            if(artistSearch.value.trim()) searchArtistsFromAPI(artistSearch.value.trim()); 
        });

        selectedArtists.appendChild(card);
    });
}

function addArtist(artist) {
    chosenArtists.push(artist);
    renderSelectedArtists();
    updateStartButton();
}

function updateStartButton() {
    if (chosenArtists.length === 0) {
        startButton.disabled = true;
        startButton.className = "mt-8 w-64 rounded-full bg-white/40 text-black/60 py-3 font-bold block mx-auto cursor-not-allowed";
    } else {
        startButton.disabled = false;
        startButton.className = "mt-8 w-64 rounded-full bg-white text-black py-3 font-bold block mx-auto hover:scale-105 transition-transform duration-200";
    }
}

artistSearch.addEventListener("input", debounce((e) => {
    searchArtistsFromAPI(e.target.value.trim());
}, 400));

// Initial Render
renderSelectedArtists();
updateStartButton();