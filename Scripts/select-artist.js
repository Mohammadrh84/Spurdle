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

const chosenArtists = [];

function updateStartButton() {
  if (chosenArtists.length === 0) {
    startButton.disabled = true;
    startButton.className = "mt-8 w-64 rounded-full bg-white/40 text-black/60 py-3 font-bold block mx-auto cursor-not-allowed";
    return;
  }

  startButton.disabled = false;
  startButton.className = "mt-8 w-64 rounded-full bg-white text-black py-3 font-bold block mx-auto hover:scale-105 transition-transform duration-200";
}

function renderSelectedArtists() {
  selectedArtists.innerHTML = "";

  if (chosenArtists.length === 0) {
    selectedArtists.innerHTML = `
      <p class="text-white/60 text-lg">No artists selected yet.</p>
    `;
    return;
  }

  chosenArtists.forEach(function (artist, index) {
    const card = document.createElement("div");
    card.className = "bg-white text-black rounded-3xl p-4 flex items-center justify-between gap-4";

    card.innerHTML = `
      <div class="flex items-center gap-4">
        <img src="${artist.image}" alt="${artist.name}" class="w-14 h-14 rounded-2xl object-cover">
        <span class="text-2xl font-bold">${artist.name}</span>
      </div>
      <button class="text-xl font-bold px-3 py-1 rounded-full bg-black text-white hover:scale-105 transition-transform duration-200">
        ×
      </button>
    `;

    const removeButton = card.querySelector("button");
    removeButton.addEventListener("click", function () {
      chosenArtists.splice(index, 1);
      renderSelectedArtists();
      renderSearchResults();
      updateStartButton();
    });

    selectedArtists.appendChild(card);
  });
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
}

function renderSearchResults() {
  const searchText = artistSearch.value.toLowerCase().trim();
  searchResults.innerHTML = "";

  const filtered = artists.filter(function (artist) {
    return artist.name.toLowerCase().includes(searchText);
  });

  if (filtered.length === 0) {
    searchResults.innerHTML = `
      <p class="text-white/60 text-lg">No artists found.</p>
    `;
    return;
  }

  filtered.forEach(function (artist) {
    const alreadySelected = chosenArtists.some(function (chosenArtist) {
      return chosenArtist.name === artist.name;
    });

    const card = document.createElement("div");
    card.className = "bg-white text-black rounded-3xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:scale-[1.01] transition-transform duration-200";

    card.innerHTML = `
      <div class="flex items-center gap-4">
        <img src="${artist.image}" alt="${artist.name}" class="w-16 h-16 rounded-2xl object-cover">
        <span class="text-3xl font-bold">${artist.name}</span>
      </div>
      <span class="text-sm font-semibold ${alreadySelected ? "text-neon-green" : "text-black/60"}">
        ${alreadySelected ? "Selected" : "Add"}
      </span>
    `;

    card.addEventListener("click", function () {
      addArtist(artist);
    });

    searchResults.appendChild(card);
  });
}

artistSearch.addEventListener("input", renderSearchResults);

renderSearchResults();
renderSelectedArtists();
updateStartButton();