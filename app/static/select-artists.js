const selectArtistsForm = document.getElementById("selectArtistsForm");
const selectedArtistsCount = document.getElementById("selectedArtistsCount");
const artistLimitMessage = document.getElementById("artistLimitMessage");
const artistCheckboxes = document.querySelectorAll(".artist-checkbox");

const maxArtists = Number(selectArtistsForm.dataset.maxArtists);

function getSelectedArtistCount() {
  return document.querySelectorAll(".artist-checkbox:checked").length;
}

function updateSelectedCount() {
  const selectedCount = getSelectedArtistCount();
  selectedArtistsCount.textContent = `${selectedCount} / ${maxArtists} selected`;

  if (selectedCount >= maxArtists) {
    artistLimitMessage.classList.remove("hidden");
  } else {
    artistLimitMessage.classList.add("hidden");
  }
}

artistCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", function () {
    const selectedCount = getSelectedArtistCount();

    if (selectedCount > maxArtists) {
      checkbox.checked = false;
      artistLimitMessage.classList.remove("hidden");
      return;
    }

    updateSelectedCount();
  });
});

updateSelectedCount();