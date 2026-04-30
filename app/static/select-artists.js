const searchResults = document.getElementById("searchResults");
const searchResultsWrap = document.getElementById("searchResultsWrap");
const selectedArtists = document.getElementById("selectedArtists");
const artistSearch = document.getElementById("artistSearch");
const selectedArtistsSummary = document.getElementById("selectedArtistsSummary");
const clearArtistsButton = document.getElementById("clearArtistsButton");
const saveArtistsButton = document.getElementById("saveArtistsButton");
const saveArtistsMessage = document.getElementById("saveArtistsMessage");
const artistLimitMessage = document.getElementById("artistLimitMessage");
const artistRequiredMessage = document.getElementById("artistRequiredMessage");
const selectArtistsForm = document.getElementById("selectArtistsForm");
const selectedArtistsJson = document.getElementById("selectedArtistsJson");
const initialSelectedArtistsScript = document.getElementById("initialSelectedArtists");

const MAX_SELECTED_ARTISTS = Number(selectArtistsForm.dataset.maxArtists);
const FALLBACK_ARTIST_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

const chosenArtists = [];

let searchTimer = null;
let activeSearchController = null;
let latestSearchId = 0;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFallbackImage() {
  return FALLBACK_ARTIST_IMAGE;
}

function stopActiveSearch() {
  latestSearchId++;

  if (activeSearchController) {
    activeSearchController.abort();
    activeSearchController = null;
  }

  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
}

function showSearchResults() {
  searchResultsWrap.classList.remove("hidden");
}

function hideSearchResults() {
  stopActiveSearch();
  searchResultsWrap.classList.add("hidden");
  searchResults.innerHTML = "";
}

function handleBrokenArtistImage(imageElement) {
  imageElement.addEventListener("error", function () {
    imageElement.src = FALLBACK_ARTIST_IMAGE;
  });
}

function loadInitialSelectedArtists() {
  try {
    const savedArtists = JSON.parse(initialSelectedArtistsScript.textContent || "[]");

    if (!Array.isArray(savedArtists)) {
      return;
    }

    savedArtists.forEach((artist) => {
      if (!artist || !artist.id || !artist.name) {
        return;
      }

      if (chosenArtists.length >= MAX_SELECTED_ARTISTS) {
        return;
      }

      if (isAlreadySelected(artist.id)) {
        return;
      }

      chosenArtists.push({
        id: String(artist.id),
        name: artist.name,
        image: artist.image || getFallbackImage(),
      });
    });
  } catch (error) {
    console.error("Could not load selected artists:", error);
  }
}

function updateHiddenSelectedArtistsInput() {
  selectedArtistsJson.value = JSON.stringify(chosenArtists);
}

function isAlreadySelected(artistId) {
  return chosenArtists.some((artist) => String(artist.id) === String(artistId));
}

function hasReachedArtistLimit() {
  return chosenArtists.length >= MAX_SELECTED_ARTISTS;
}

function updateSaveButton() {
  selectedArtistsSummary.textContent = `${chosenArtists.length} / ${MAX_SELECTED_ARTISTS} selected`;

  if (chosenArtists.length === 0) {
    saveArtistsButton.disabled = true;
    saveArtistsButton.className =
      "w-full rounded-full bg-white/10 px-4 py-3 font-bold text-white/40 cursor-not-allowed transition md:w-64";

    clearArtistsButton.classList.add("hidden");

    saveArtistsMessage.textContent = "Select at least one artist to continue.";
    saveArtistsMessage.className = "text-center text-sm text-white/50";
  } else {
    saveArtistsButton.disabled = false;
    saveArtistsButton.className =
      "w-full rounded-full bg-neon-green px-4 py-3 font-bold text-black transition hover:scale-105 md:w-64";

    clearArtistsButton.classList.remove("hidden");

    saveArtistsMessage.textContent = "Ready to save selected artists.";
    saveArtistsMessage.className = "text-center text-sm text-neon-green/80";
  }

  if (hasReachedArtistLimit()) {
    artistLimitMessage.classList.remove("hidden");
  } else {
    artistLimitMessage.classList.add("hidden");
  }

  if (chosenArtists.length > 0) {
    artistRequiredMessage.classList.add("hidden");
  }

  updateHiddenSelectedArtistsInput();
}

function renderSelectedArtists() {
  selectedArtists.innerHTML = "";

  if (chosenArtists.length === 0) {
    selectedArtists.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/60">
        No artists selected yet.
      </div>
    `;

    updateSaveButton();
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
        src="${escapeHtml(artist.image || getFallbackImage())}"
        alt="${escapeHtml(artist.name)}"
        class="w-10 h-10 rounded-full object-cover shrink-0 bg-black/20"
      >

      <span class="max-w-[170px] truncate text-sm font-semibold text-white">
        ${escapeHtml(artist.name)}
      </span>

      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-sm font-bold text-white transition hover:text-neon-green"
        aria-label="Remove ${escapeHtml(artist.name)}"
      >
        ×
      </button>
    `;

    const chipImage = chip.querySelector("img");
    handleBrokenArtistImage(chipImage);

    const removeButton = chip.querySelector("button");

    removeButton.addEventListener("click", function () {
      chosenArtists.splice(index, 1);
      renderSelectedArtists();
    });

    chipsWrapper.appendChild(chip);
  });

  selectedArtists.appendChild(chipsWrapper);
  updateSaveButton();
}

async function fetchArtistImageAndUpdate(artistId) {
  try {
    const response = await fetch(`/api/artist-image-by-id?artist_id=${encodeURIComponent(artistId)}`);
    const data = await response.json();

    if (!data.image || data.image === FALLBACK_ARTIST_IMAGE) {
      return;
    }

    const selectedArtist = chosenArtists.find((artist) => String(artist.id) === String(artistId));

    if (selectedArtist) {
      selectedArtist.image = data.image;
      renderSelectedArtists();
    }
  } catch (error) {
    console.error("Artist image failed:", error);
  }
}

function addArtist(artist) {
  if (isAlreadySelected(artist.id)) {
    hideSearchResults();
    artistSearch.value = "";
    return false;
  }

  if (hasReachedArtistLimit()) {
    renderSearchMessage(`You can only select up to ${MAX_SELECTED_ARTISTS} artists.`, true);
    return false;
  }

  chosenArtists.push({
    id: String(artist.id),
    name: artist.name,
    image: artist.image || getFallbackImage(),
  });

  artistSearch.value = "";
  hideSearchResults();
  renderSelectedArtists();

  fetchArtistImageAndUpdate(artist.id);

  return true;
}

function renderSearchMessage(message, isError = false) {
  searchResults.innerHTML = `
    <li class="px-4 py-3 text-sm ${isError ? "text-red-400" : "text-white/60"} border-b border-white/5 last:border-0">
      ${escapeHtml(message)}
    </li>
  `;

  showSearchResults();
}

function renderSearchResults(results, searchId, query) {
  if (searchId !== latestSearchId) {
    return;
  }

  if (artistSearch.value.trim() !== query) {
    return;
  }

  searchResults.innerHTML = "";

  const limitReached = hasReachedArtistLimit();

  results.forEach((artistData) => {
    const artist = {
      id: String(artistData.id),
      name: artistData.name,
      image: artistData.image || getFallbackImage(),
    };

    const alreadySelected = isAlreadySelected(artist.id);
    const cannotAdd = alreadySelected || limitReached;

    const item = document.createElement("li");

    item.className = "px-4 py-3 border-b border-white/5 last:border-0";

    let statusText = "Tap to add";
    let buttonText = "Add";

    if (alreadySelected) {
      statusText = "Already selected";
      buttonText = "Selected";
    } else if (limitReached) {
      statusText = "Limit reached";
      buttonText = "Max";
    }

    item.innerHTML = `
      <button
        type="button"
        class="w-full flex items-center justify-between gap-3 text-left ${cannotAdd ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:text-neon-green"}"
        ${cannotAdd ? "disabled" : ""}
      >
        <div class="flex items-center gap-3 min-w-0">
          <img
            src="${escapeHtml(artist.image)}"
            alt="${escapeHtml(artist.name)}"
            class="w-10 h-10 rounded-full object-cover shrink-0 bg-black/20"
          >

          <div class="min-w-0">
            <p class="text-sm font-semibold text-white truncate">${escapeHtml(artist.name)}</p>
            <p class="text-xs text-white/45">
              ${escapeHtml(statusText)}
            </p>
          </div>
        </div>

        <span class="shrink-0 text-xs font-semibold ${alreadySelected ? "text-neon-green" : "text-white/45"}">
          ${escapeHtml(buttonText)}
        </span>
      </button>
    `;

    const resultImage = item.querySelector("img");
    handleBrokenArtistImage(resultImage);

    fetch(`/api/artist-image-by-id?artist_id=${encodeURIComponent(artist.id)}`)
      .then((response) => response.json())
      .then((data) => {
        if (searchId !== latestSearchId) {
          return;
        }

        if (data.image && data.image !== FALLBACK_ARTIST_IMAGE) {
          artist.image = data.image;
          resultImage.src = data.image;
        }
      })
      .catch(() => {});

    const button = item.querySelector("button");

    if (!cannotAdd) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        addArtist(artist);
      });
    }

    searchResults.appendChild(item);
  });

  showSearchResults();
}

async function searchArtistsFromAPI(query) {
  query = query.trim();

  if (query.length === 0) {
    hideSearchResults();
    return;
  }

  stopActiveSearch();

  const searchId = ++latestSearchId;
  activeSearchController = new AbortController();

  renderSearchMessage("Searching...");

  try {
    const response = await fetch(
      `/api/search-artists?term=${encodeURIComponent(query)}`,
      { signal: activeSearchController.signal }
    );

    const data = await response.json();

    if (searchId !== latestSearchId) {
      return;
    }

    if (artistSearch.value.trim() !== query) {
      return;
    }

    if (!response.ok) {
      renderSearchMessage("Error searching artists.", true);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      renderSearchMessage("No artists found. Try a different spelling.");
      return;
    }

    renderSearchResults(data, searchId, query);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    if (searchId !== latestSearchId) {
      return;
    }

    console.error("Artist search failed:", error);
    renderSearchMessage("Error searching artists.", true);
  }
}

artistSearch.addEventListener("input", function (event) {
  const query = event.target.value;

  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(function () {
    searchArtistsFromAPI(query);
  }, 150);
});

document.addEventListener("mousedown", function (event) {
  if (!artistSearch.contains(event.target) && !searchResultsWrap.contains(event.target)) {
    hideSearchResults();
  }
});

selectArtistsForm.addEventListener("submit", function (event) {
  const clickedButton = event.submitter || document.activeElement;

  if (clickedButton && clickedButton.dataset.skipValidation === "true") {
    return;
  }

  updateHiddenSelectedArtistsInput();

  if (chosenArtists.length === 0) {
    event.preventDefault();
    artistRequiredMessage.classList.remove("hidden");
    updateSaveButton();
  }
});

setTimeout(function () {
  const messages = document.querySelectorAll(".status-message");

  messages.forEach((message) => {
    message.classList.add("hidden");
  });
}, 2500);

loadInitialSelectedArtists();
renderSelectedArtists();
updateSaveButton();