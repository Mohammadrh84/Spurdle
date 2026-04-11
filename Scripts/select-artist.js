const artists = [
  { name: "Drake", image: "https://upload.wikimedia.org/wikipedia/commons/9/90/Drake_in_2016.jpg" },
  { name: "John Mayer", image: "https://upload.wikimedia.org/wikipedia/commons/3/30/John_Mayer_2010.jpg" },
  { name: "Kanye West", image: "https://upload.wikimedia.org/wikipedia/commons/4/45/Kanye_West_at_the_2009_Tribeca_Film_Festival.jpg" },
  { name: "Playboi Carti", image: "https://upload.wikimedia.org/wikipedia/commons/6/6d/Playboi_Carti_2016.jpg" }
];

const searchResults = document.getElementById("searchResults");
const selectedArtists = document.getElementById("selectedArtists");
const artistSearch = document.getElementById("artistSearch");
const startButton = document.getElementById("startButton");

const availableArtistsCount = document.getElementById("availableArtistsCount");
const selectedArtistsCount = document.getElementById("selectedArtistsCount");
const selectedArtistsSummary = document.getElementById("selectedArtistsSummary");

const chosenArtists = [];

function getFallbackAvatar(name) {
  return `
    <div class="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold text-lg">
      ${name.charAt(0).toUpperCase()}
    </div>
  `;
}

function updateCounts() {
  availableArtistsCount.textContent = artists.length;
  selectedArtistsCount.textContent = chosenArtists.length;
  selectedArtistsSummary.textContent = `${chosenArtists.length} selected`;
}

function updateStartButton() {
  if (chosenArtists.length === 0) {
    startButton.disabled = true;
    startButton.textContent = "Start game";
    startButton.className =
      "mt-6 w-full rounded-xl bg-white/10 px-4 py-3 font-bold text-white/40 cursor-not-allowed md:w-auto md:min-w-[220px]";
    return;
  }

  startButton.disabled = false;
  startButton.textContent = `Start game (${chosenArtists.length})`;
  startButton.className =
    "mt-6 w-full rounded-xl bg-neon-green px-4 py-3 font-bold text-black transition hover:scale-[1.02] hover:shadow-[0_0_10px_#3Dff6e] md:w-auto md:min-w-[220px]";
}

function applyImageFallback(card, artistName) {
  const image = card.querySelector("img");

  if (!image) {
    return;
  }

  image.addEventListener("error", function () {
    image.outerHTML = getFallbackAvatar(artistName);
  });
}

function renderSelectedArtists() {
  selectedArtists.innerHTML = "";

  if (chosenArtists.length === 0) {
    selectedArtists.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/60">
        No artists selected yet.
      </div>
    `;
    updateCounts();
    return;
  }

  chosenArtists.forEach(function (artist, index) {
    const card = document.createElement("div");
    card.className =
      "rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4";

    card.innerHTML = `
      <div class="flex items-center gap-4 min-w-0">
        <img src="${artist.image}" alt="${artist.name}" class="w-14 h-14 rounded-2xl object-cover shrink-0">
        <div class="min-w-0">
          <p class="text-lg font-bold text-white truncate">${artist.name}</p>
          <p class="text-sm text-white/55">Selected for this game</p>
        </div>
      </div>
      <button class="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white transition hover:text-neon-green">
        Remove
      </button>
    `;

    const removeButton = card.querySelector("button");
    removeButton.addEventListener("click", function () {
      chosenArtists.splice(index, 1);
      renderSelectedArtists();
      renderSearchResults();
      updateStartButton();
      updateCounts();
    });

    applyImageFallback(card, artist.name);
    selectedArtists.appendChild(card);
  });

  updateCounts();
}

function addArtist(artist) {
  const alreadySelected = chosenArtists.some(function (chosenArtist) {
    return chosenArtist.name === artist.name;
  });

  if (alreadySelected) {
    return;
  }

  chosenArtists.push(artist);
  renderSelectedArtists();
  renderSearchResults();
  updateStartButton();
  updateCounts();
}

function renderSearchResults() {
  const searchText = artistSearch.value.toLowerCase().trim();
  searchResults.innerHTML = "";

  const filtered = artists.filter(function (artist) {
    return artist.name.toLowerCase().includes(searchText);
  });

  if (filtered.length === 0) {
    searchResults.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/60">
        No artists found.
      </div>
    `;
    return;
  }

  filtered.forEach(function (artist) {
    const alreadySelected = chosenArtists.some(function (chosenArtist) {
      return chosenArtist.name === artist.name;
    });

    const card = document.createElement("div");
    card.className =
      "rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4 cursor-pointer transition hover:border-neon-green/30 hover:bg-white/10";

    card.innerHTML = `
      <div class="flex items-center gap-4 min-w-0">
        <img src="${artist.image}" alt="${artist.name}" class="w-14 h-14 rounded-2xl object-cover shrink-0">
        <div class="min-w-0">
          <p class="text-lg font-bold text-white truncate">${artist.name}</p>
          <p class="text-sm text-white/55">Tap to add artist</p>
        </div>
      </div>
      <span class="text-sm font-semibold ${alreadySelected ? "text-neon-green" : "text-white/45"}">
        ${alreadySelected ? "Selected" : "Add"}
      </span>
    `;

    card.addEventListener("click", function () {
      addArtist(artist);
    });

    applyImageFallback(card, artist.name);
    searchResults.appendChild(card);
  });
}

artistSearch.addEventListener("input", renderSearchResults);

startButton.addEventListener("click", function () {
  if (chosenArtists.length === 0) {
    return;
  }

  // Placeholder only for now.
  // This page stays focused on artist selection UI polish.
  alert("Artists selected successfully.");
});

renderSearchResults();
renderSelectedArtists();
updateStartButton();
updateCounts();