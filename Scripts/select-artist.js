const searchResults = document.getElementById("searchResults");
const searchResultsWrap = document.getElementById("searchResultsWrap");
const selectedArtists = document.getElementById("selectedArtists");
const artistSearch = document.getElementById("artistSearch");
const startButton = document.getElementById("startButton");
const selectedArtistsSummary = document.getElementById("selectedArtistsSummary");

const MAX_SELECTED_ARTISTS = 10;
const chosenArtists = [];

function debounce(func, timeout = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(null, args);
    }, timeout);
  };
}

function getFallbackImage() {
  return "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
}

function showSearchResults() {
  searchResultsWrap.classList.remove("hidden");
}

function hideSearchResults() {
  searchResultsWrap.classList.add("hidden");
  searchResults.innerHTML = "";
}

function isAlreadySelected(artistId) {
  return chosenArtists.some((artist) => artist.id === artistId);
}

async function getArtistImageFromApple(artistId) {
  try {
    const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 1) {
      const albumData = data.results[1];

      if (albumData.artworkUrl100) {
        return albumData.artworkUrl100.replace("100x100bb", "600x600bb");
      }
    }

    return getFallbackImage();
  } catch (error) {
    console.error("Failed to fetch artist image:", error);
    return getFallbackImage();
  }
}

function updateStartButton() {
  selectedArtistsSummary.textContent = `${chosenArtists.length} / ${MAX_SELECTED_ARTISTS} selected`;

  if (chosenArtists.length === 0) {
    startButton.disabled = true;
    startButton.className =
      "mt-8 w-full rounded-full bg-white/10 px-4 py-3 font-bold text-white/40 cursor-not-allowed transition md:mx-auto md:block md:w-64";
    return;
  }

  startButton.disabled = false;
  startButton.className =
    "mt-8 w-full rounded-full bg-neon-green px-4 py-3 font-bold text-black transition hover:scale-105 md:mx-auto md:block md:w-64";
}

function renderSelectedArtists() {
  selectedArtists.innerHTML = "";

  if (chosenArtists.length === 0) {
    selectedArtists.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/60">
        No artists selected yet.
      </div>
    `;

    updateStartButton();
    return;
  }

  const chipsWrapper = document.createElement("div");
  chipsWrapper.className = "flex flex-wrap gap-3";

  chosenArtists.forEach((artist, index) => {
    const chip = document.createElement("div");

    chip.className =
      "flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-2 pr-3";

    chip.innerHTML = `
      <img
        src="${artist.image}"
        alt="${artist.name}"
        class="w-10 h-10 rounded-full object-cover shrink-0 bg-black/20"
      >

      <span class="max-w-[170px] truncate text-sm font-semibold text-white">
        ${artist.name}
      </span>

      <button
        class="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-sm font-bold text-white transition hover:text-neon-green"
        aria-label="Remove ${artist.name}"
      >
        ×
      </button>
    `;

    const removeButton = chip.querySelector("button");

    removeButton.addEventListener("click", function () {
      chosenArtists.splice(index, 1);
      renderSelectedArtists();

      const currentQuery = artistSearch.value.trim();

      if (currentQuery) {
        searchArtistsFromAPI(currentQuery);
      }
    });

    chipsWrapper.appendChild(chip);
  });

  selectedArtists.appendChild(chipsWrapper);
  updateStartButton();
}

function addArtist(artist) {
  if (isAlreadySelected(artist.id)) {
    return;
  }

  if (chosenArtists.length >= MAX_SELECTED_ARTISTS) {
    renderSearchMessage(`You can only select up to ${MAX_SELECTED_ARTISTS} artists.`, true);
    return;
  }

  chosenArtists.push(artist);
  renderSelectedArtists();
}

function renderSearchMessage(message, isError = false) {
  showSearchResults();

  searchResults.innerHTML = `
    <li class="px-4 py-3 text-sm ${isError ? "text-red-400" : "text-white/60"} border-b border-white/5 last:border-0">
      ${message}
    </li>
  `;
}

function renderSearchResults(results) {
  searchResults.innerHTML = "";

  results.forEach((artistData, index) => {
    const artist = {
      id: artistData.artistId,
      name: artistData.artistName,
      image: getFallbackImage(),
    };

    const alreadySelected = isAlreadySelected(artist.id);
    const item = document.createElement("li");

    item.className = "px-4 py-3 border-b border-white/5 last:border-0";

    const imageId = `artist-image-${artist.id}-${index}`;

    item.innerHTML = `
      <button
        type="button"
        class="w-full flex items-center justify-between gap-3 text-left ${alreadySelected ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:text-neon-green"}"
        ${alreadySelected ? "disabled" : ""}
      >
        <div class="flex items-center gap-3 min-w-0">
          <img
            id="${imageId}"
            src="${artist.image}"
            alt="${artist.name}"
            class="w-10 h-10 rounded-full object-cover shrink-0 bg-black/20"
          >

          <div class="min-w-0">
            <p class="text-sm font-semibold text-white truncate">${artist.name}</p>
            <p class="text-xs text-white/45">
              ${alreadySelected ? "Already selected" : "Tap to add"}
            </p>
          </div>
        </div>

        <span class="shrink-0 text-xs font-semibold ${alreadySelected ? "text-neon-green" : "text-white/45"}">
          ${alreadySelected ? "Selected" : "Add"}
        </span>
      </button>
    `;

    const button = item.querySelector("button");

    if (!alreadySelected) {
      button.addEventListener("click", async function () {
        const status = button.querySelector("span:last-child");

        if (status) {
          status.textContent = "Loading...";
        }

        artist.image = await getArtistImageFromApple(artist.id);

        addArtist(artist);

        artistSearch.value = "";
        hideSearchResults();
      });
    }

    searchResults.appendChild(item);

    getArtistImageFromApple(artist.id).then((imageUrl) => {
      const imageElement = document.getElementById(imageId);

      if (imageElement) {
        imageElement.src = imageUrl;
      }
    });
  });

  showSearchResults();
}

async function searchArtistsFromAPI(query) {
  if (!query) {
    hideSearchResults();
    return;
  }

  renderSearchMessage("Searching...");

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=6`
    );

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      renderSearchMessage("No artists found.");
      return;
    }

    renderSearchResults(results);
  } catch (error) {
    console.error("Artist search failed:", error);
    renderSearchMessage("Error searching artists.", true);
  }
}

artistSearch.addEventListener(
  "input",
  debounce(function (event) {
    searchArtistsFromAPI(event.target.value.trim());
  }, 400)
);

document.addEventListener("click", function (event) {
  if (!artistSearch.contains(event.target) && !searchResultsWrap.contains(event.target)) {
    hideSearchResults();
  }
});

startButton.addEventListener("click", function () {
  if (chosenArtists.length === 0) {
    return;
  }

  console.log("Selected artists:", chosenArtists);
});

renderSelectedArtists();
updateStartButton();