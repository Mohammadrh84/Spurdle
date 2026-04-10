// --- Global Variables ---
const searchResults = document.getElementById("searchResults");
const selectedArtists = document.getElementById("selectedArtists");
const artistSearch = document.getElementById("artistSearch");
const startButton = document.getElementById("startButton");

const chosenArtists = [];


async function GetArtistImageFromApple(artistId) {
    try {
        // just change entity=song to album
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

        // need a function here for rendering the search results

    } catch (error) {
        console.error("API Error:", error);
        searchResults.innerHTML = `<p class="text-red-400 text-lg">Error searching artists.</p>`;
    }
}

