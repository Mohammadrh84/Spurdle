// --- Global Variables ---
const searchResults = document.getElementById("searchResults");
const selectedArtists = document.getElementById("selectedArtists");
const artistSearch = document.getElementById("artistSearch");
const startButton = document.getElementById("startButton");

const chosenArtists = [];


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

