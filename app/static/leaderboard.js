let players = [];
let currentSort = "points";

function formatNumber(number) {
  return Number(number || 0).toLocaleString();
}

function getVisiblePlayers(searchInput) {
  const searchText = searchInput.value.toLowerCase();

  let filteredPlayers = players.filter(function (player) {
    return player.name.toLowerCase().includes(searchText);
  });

  filteredPlayers.sort(function (a, b) {
    if (currentSort === "streak") {
      return b.streak - a.streak;
    }

    if (currentSort === "accuracy") {
      return b.accuracy - a.accuracy;
    }

    return b.points - a.points;
  });

  return filteredPlayers;
}

function getGlobalTopPlayers() {
  const globalPlayers = [...players];

  globalPlayers.sort(function (a, b) {
    return b.points - a.points;
  });

  return globalPlayers;
}

function updateStats(playerList, elements) {
  if (playerList.length === 0) {
    elements.totalPlayersStat.textContent = "0";
    elements.topScoreStat.textContent = "0";
    elements.bestStreakStat.textContent = "0";
    elements.avgAccuracyStat.textContent = "0%";
    return;
  }

  elements.totalPlayersStat.textContent = playerList.length;
  elements.topScoreStat.textContent = formatNumber(playerList[0].points);

  const maxStreak = Math.max(...playerList.map(player => player.streak || 0));
  elements.bestStreakStat.textContent = formatNumber(maxStreak);

  let totalAccuracy = 0;

  for (let player of playerList) {
    totalAccuracy += player.accuracy || 0;
  }

  const averageAccuracy = Math.round(totalAccuracy / playerList.length);
  elements.avgAccuracyStat.textContent = averageAccuracy + "%";
}

function updatePodium(playerList, podiumSection) {
  const topThree = playerList.slice(0, 3);
  podiumSection.innerHTML = "";

  if (topThree.length === 0) {
    podiumSection.innerHTML = `
      <div class="rounded-[24px] border border-white/10 bg-white/5 p-5 md:col-span-3">
        <p class="text-sm text-white/60">No leaderboard data yet. Play a game to create the first score.</p>
      </div>
    `;
    return;
  }

  topThree.forEach(function (player, index) {
    const card = document.createElement("div");
    card.className = "rounded-[24px] border border-white/10 bg-white/5 p-5";

    card.innerHTML = `
      <p class="text-xs uppercase tracking-[0.22em] text-white/45">Top ${index + 1}</p>
      <h3 class="mt-3 text-2xl font-bold">${player.name}</h3>
      <p class="mt-2 text-neon-green font-semibold">${formatNumber(player.points)} points</p>
      <p class="mt-1 text-sm text-white/60">${formatNumber(player.streak)} streak</p>
    `;

    podiumSection.appendChild(card);
  });
}

function updatePlayerDetail(playerList, playerDetail) {
  if (playerList.length === 0) {
    playerDetail.innerHTML = `<p class="text-sm text-white/60">No players found.</p>`;
    return;
  }

  const topPlayer = playerList[0];

  playerDetail.innerHTML = `
    <p class="text-xs uppercase tracking-[0.25em] text-neon-green/80">Current top player</p>
    <h3 class="mt-3 text-2xl font-bold">${topPlayer.name}</h3>
    <p class="mt-2 text-white/70">
      ${formatNumber(topPlayer.points)} points · ${formatNumber(topPlayer.streak)} streak · ${topPlayer.accuracy}% accuracy
    </p>
  `;
}

function updateTable(playerList, tableBody) {
  tableBody.innerHTML = "";

  if (playerList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="rounded-2xl px-4 py-6 text-center text-white/60 bg-white/5">
          No players found.
        </td>
      </tr>
    `;
    return;
  }

  playerList.forEach(function (player, index) {
    const row = document.createElement("tr");
    row.className = "bg-white/5 hover:bg-white/10 transition";

    row.innerHTML = `
      <td class="rounded-l-2xl px-4 py-4 font-bold">${index + 1}</td>
      <td class="px-4 py-4 font-semibold">${player.name}</td>
      <td class="px-4 py-4">${formatNumber(player.points)}</td>
      <td class="px-4 py-4">${formatNumber(player.streak)}</td>
      <td class="px-4 py-4">${player.accuracy}%</td>
      <td class="px-4 py-4">${formatNumber(player.games)}</td>
      <td class="rounded-r-2xl px-4 py-4">${player.avgHints}</td>
    `;

    tableBody.appendChild(row);
  });
}

function updateCards(playerList, cardsContainer) {
  cardsContainer.innerHTML = "";

  if (playerList.length === 0) {
    cardsContainer.innerHTML = `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/60">
        No players found.
      </div>
    `;
    return;
  }

  playerList.forEach(function (player, index) {
    const card = document.createElement("div");
    card.className = "rounded-2xl border border-white/10 bg-white/5 p-4";

    card.innerHTML = `
      <p class="text-xs uppercase tracking-[0.2em] text-white/45">#${index + 1}</p>
      <h3 class="mt-2 text-xl font-bold">${player.name}</h3>
      <p class="mt-2 text-neon-green font-semibold">${formatNumber(player.points)} points</p>
      <p class="mt-1 text-sm text-white/60">${formatNumber(player.streak)} streak · ${player.accuracy}% accuracy</p>
    `;

    cardsContainer.appendChild(card);
  });
}

function renderLeaderboard(elements) {
  const visiblePlayers = getVisiblePlayers(elements.searchInput);
  const globalTopPlayers = getGlobalTopPlayers();

  updateStats(visiblePlayers, elements);
  updatePodium(globalTopPlayers, elements.podiumSection);
  updatePlayerDetail(visiblePlayers, elements.playerDetail);
  updateTable(visiblePlayers, elements.tableBody);
  updateCards(visiblePlayers, elements.cardsContainer);
}

async function loadLeaderboard(elements) {
  try {
    const response = await fetch('/api/leaderboard');
    players = await response.json();

    if (!Array.isArray(players)) {
      players = [];
    }

    renderLeaderboard(elements);
  } catch (error) {
    console.error("Could not load leaderboard:", error);
    players = [];
    renderLeaderboard(elements);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const elements = {
    totalPlayersStat: document.getElementById("totalPlayersStat"),
    topScoreStat: document.getElementById("topScoreStat"),
    bestStreakStat: document.getElementById("bestStreakStat"),
    avgAccuracyStat: document.getElementById("avgAccuracyStat"),
    podiumSection: document.getElementById("podiumSection"),
    tableBody: document.getElementById("leaderboardTableBody"),
    cardsContainer: document.getElementById("leaderboardCards"),
    playerDetail: document.getElementById("playerDetail"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect")
  };

  elements.searchInput.addEventListener("input", function () {
    renderLeaderboard(elements);
  });

  elements.sortSelect.addEventListener("change", function () {
    currentSort = elements.sortSelect.value;
    renderLeaderboard(elements);
  });

  loadLeaderboard(elements);
});