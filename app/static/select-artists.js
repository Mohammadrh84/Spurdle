const selectArtistsForm = document.getElementById("selectArtistsForm");
const selectedArtistsCount = document.getElementById("selectedArtistsCount");
const artistLimitMessage = document.getElementById("artistLimitMessage");
const artistRequiredMessage = document.getElementById("artistRequiredMessage");
const saveArtistsButton = document.getElementById("saveArtistsButton");
const saveArtistsMessage = document.getElementById("saveArtistsMessage");
const clearArtistsButton = document.getElementById("clearArtistsButton");
const artistCheckboxes = document.querySelectorAll(".artist-checkbox");

const maxArtists = Number(selectArtistsForm.dataset.maxArtists);

function getSelectedArtistCount() {
  return document.querySelectorAll(".artist-checkbox:checked").length;
}

function updateArtistCardStyles() {
  artistCheckboxes.forEach((checkbox) => {
    const artistCard = checkbox.closest(".artist-card");

    if (checkbox.checked) {
      artistCard.classList.add("border-neon-green", "bg-neon-green/5");
      artistCard.classList.remove("border-white/10", "bg-white/5");
    } else {
      artistCard.classList.add("border-white/10", "bg-white/5");
      artistCard.classList.remove("border-neon-green", "bg-neon-green/5");
    }
  });
}

function updateSelectedCount() {
  const selectedCount = getSelectedArtistCount();

  selectedArtistsCount.textContent = `${selectedCount} / ${maxArtists} selected`;

  if (selectedCount === 0) {
    saveArtistsButton.disabled = true;
    saveArtistsButton.className =
      "w-full rounded-full bg-white/10 px-4 py-3 font-bold text-white/40 cursor-not-allowed transition md:w-64";

    saveArtistsMessage.textContent = "Select at least one artist to continue.";
    saveArtistsMessage.className = "text-center text-sm text-white/50";

    clearArtistsButton.classList.add("hidden");
  } else {
    saveArtistsButton.disabled = false;
    saveArtistsButton.className =
      "w-full rounded-full bg-neon-green px-4 py-3 font-bold text-black transition hover:scale-105 md:w-64";

    saveArtistsMessage.textContent = "Ready to save selected artists.";
    saveArtistsMessage.className = "text-center text-sm text-neon-green/80";

    clearArtistsButton.classList.remove("hidden");
  }

  if (selectedCount >= maxArtists) {
    artistLimitMessage.classList.remove("hidden");
  } else {
    artistLimitMessage.classList.add("hidden");
  }

  if (selectedCount > 0) {
    artistRequiredMessage.classList.add("hidden");
  }

  updateArtistCardStyles();
}

artistCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", function () {
    const selectedCount = getSelectedArtistCount();

    if (selectedCount > maxArtists) {
      checkbox.checked = false;
      artistLimitMessage.classList.remove("hidden");
      updateSelectedCount();
      return;
    }

    updateSelectedCount();
  });
});

clearArtistsButton.addEventListener("click", function () {
  artistCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  updateSelectedCount();
});

selectArtistsForm.addEventListener("submit", function (event) {
  const selectedCount = getSelectedArtistCount();

  if (selectedCount === 0) {
    event.preventDefault();
    artistRequiredMessage.classList.remove("hidden");
    updateSelectedCount();
  }
});

updateSelectedCount();