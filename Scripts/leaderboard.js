const players = [
  { name: "John", username: "john23", points: 432532, streak: 1923, accuracy: 96, games: 184, avgHints: 1.3 },
  { name: "Nathan", username: "nathan84", points: 320000, streak: 841, accuracy: 91, games: 167, avgHints: 1.8 },
  { name: "Mohammad", username: "mohammadh", points: 320000, streak: 841, accuracy: 91, games: 152, avgHints: 2.0 },
  { name: "John", username: "johnbeats", points: 280000, streak: 522, accuracy: 89, games: 146, avgHints: 2.0 },
  { name: "Dhruv", username: "dhruv11", points: 250000, streak: 411, accuracy: 85, games: 141, avgHints: 2.2 },
  { name: "Surtaj", username: "surtaj_s", points: 98450, streak: 48, accuracy: 79, games: 64, avgHints: 2.7 }
];

const totalPlayersStat = document.getElementById("totalPlayersStat");
const topScoreStat = document.getElementById("topScoreStat");
const bestStreakStat = document.getElementById("bestStreakStat");
const avgAccuracyStat = document.getElementById("avgAccuracyStat");

const podiumSection = document.getElementById("podiumSection");
const tableBody = document.getElementById("leaderboardTableBody");
const cardsContainer = document.getElementById("leaderboardCards");
const playerDetail = document.getElementById("playerDetail");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

let currentSort = "points";

function formatNumber(number) {
  return number.toLocaleString();
}

function formatUsername(username) {
  return "@" + username;
}

function sortPlayers(playerList, sortBy) {
  return [...playerList].sort(function (a, b) {
    if (sortBy === "streak") {
      return (
        b.streak - a.streak ||
        b.points - a.points ||
        b.accuracy - a.accuracy ||
        a.name.localeCompare(b.name) ||
        a.username.localeCompare(b.username)
      );
    }

    if (sortBy === "accuracy") {
      return (
        b.accuracy - a.accuracy ||
        b.points - a.points ||
        b.streak - a.streak ||
        a.name.localeCompare(b.name) ||
        a.username.localeCompare(b.username)
      );
    }

    return (
      b.points - a.points ||
      b.streak - a.streak ||
      b.accuracy - a.accuracy ||
      a.name.localeCompare(b.name) ||
      a.username.localeCompare(b.username)
    );
  });
}

function getVisiblePlayers() {
  const searchText = searchInput.value.trim().toLowerCase().replace(/^@/, "");

  const filteredPlayers = players.filter(function (player) {
    return (
      player.name.toLowerCase().includes(searchText) ||
      player.username.toLowerCase().includes(searchText)
    );
  });

  return sortPlayers(filteredPlayers, currentSort);
}

function getGlobalTopPlayers() {
  return sortPlayers(players, "points");
}

function updateStats(playerList) {
  if (playerList.length === 0) {
    totalPlayersStat.textContent = "0";
    topScoreStat.textContent = "0";
    bestStreakStat.textContent = "0";
    avgAccuracyStat.textContent = "0%";
    return;
  }

  totalPlayersStat.textContent = playerList.length;
  topScoreStat.textContent = formatNumber(playerList[0].points);

  const maxStreak = Math.max(...playerList.map(function (player) {
    return player.streak;
  }));
  bestStreakStat.textContent = formatNumber(maxStreak);

  let totalAccuracy = 0;
  for (const player of playerList) {
    totalAccuracy += player.accuracy;
  }

  const averageAccuracy = Math.round(totalAccuracy / playerList.length);
  avgAccuracyStat.textContent = averageAccuracy + "%";
}

function updatePodium(playerList) {
  const topThree = playerList.slice(0, 3);
  podiumSection.innerHTML = "";

  topThree.forEach(function (player, index) {
    const card = document.createElement("div");
    card.className = "rounded-[24px] border border-white/10 bg-white/5 p-5";

    card.innerHTML = `
      <p class="text-xs uppercase tracking-[0.22em] text-white/45">Top ${index + 1}</p>
      <h3 class="mt-3 text-2xl font-bold">${player.name}</h3>
      <p class="mt-1 text-sm text-white/45">${formatUsername(player.username)}</p>
      <p class="mt-2 text-neon-green font-semibold">${formatNumber(player.points)} points</p>
      <p class="mt-1 text-sm text-white/60">${player.streak} day streak</p>
    `;

    podiumSection.appendChild(card);
  });
}

function updatePlayerDetail(playerList) {
  if (playerList.length === 0) {
    playerDetail.innerHTML = `<p class="text-sm text-white/60">No players found.</p>`;
    return;
  }

  const topPlayer = playerList[0];

  playerDetail.innerHTML = `
    <p class="text-xs uppercase tracking-[0.25em] text-neon-green/80">Current top player</p>
    <h3 class="mt-3 text-2xl font-bold">${topPlayer.name}</h3>
    <p class="mt-1 text-sm text-white/45">${formatUsername(topPlayer.username)}</p>
    <p class="mt-2 text-white/70">
      ${formatNumber(topPlayer.points)} points · ${topPlayer.streak} streak · ${topPlayer.accuracy}% accuracy
    </p>
  `;
}

function updateTable(playerList) {
  tableBody.innerHTML = "";

  if (playerList.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="7" class="rounded-2xl px-4 py-6 text-center text-white/60 bg-white/5">
        No players found.
      </td>
    `;
    tableBody.appendChild(row);
    return;
  }

  playerList.forEach(function (player, index) {
    const row = document.createElement("tr");
    row.className = "bg-white/5 hover:bg-white/10 transition";

    row.innerHTML = `
      <td class="rounded-l-2xl px-4 py-4 font-bold">${index + 1}</td>
      <td class="px-4 py-4 font-semibold">
        <div>${player.name}</div>
        <div class="text-xs font-normal text-white/45">${formatUsername(player.username)}</div>
      </td>
      <td class="px-4 py-4">${formatNumber(player.points)}</td>
      <td class="px-4 py-4">${player.streak}</td>
      <td class="px-4 py-4">${player.accuracy}%</td>
      <td class="px-4 py-4">${player.games}</td>
      <td class="rounded-r-2xl px-4 py-4">${player.avgHints}</td>
    `;

    tableBody.appendChild(row);
  });
}

function updateCards(playerList) {
  cardsContainer.innerHTML = "";

  if (playerList.length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "rounded-2xl border border-white/10 bg-white/5 p-4 text-white/60";
    emptyCard.textContent = "No players found.";
    cardsContainer.appendChild(emptyCard);
    return;
  }

  playerList.forEach(function (player, index) {
    const card = document.createElement("div");
    card.className = "rounded-2xl border border-white/10 bg-white/5 p-4";

    card.innerHTML = `
      <p class="text-xs uppercase tracking-[0.2em] text-white/45">#${index + 1}</p>
      <h3 class="mt-2 text-xl font-bold">${player.name}</h3>
      <p class="mt-1 text-sm text-white/45">${formatUsername(player.username)}</p>
      <p class="mt-2 text-neon-green font-semibold">${formatNumber(player.points)} points</p>
      <p class="mt-1 text-sm text-white/60">${player.streak} streak · ${player.accuracy}% accuracy</p>
    `;

    cardsContainer.appendChild(card);
  });
}

function renderLeaderboard() {
  const visiblePlayers = getVisiblePlayers();
  const globalTopPlayers = getGlobalTopPlayers();

  updateStats(visiblePlayers);
  updatePodium(globalTopPlayers);
  updatePlayerDetail(visiblePlayers);
  updateTable(visiblePlayers);
  updateCards(visiblePlayers);
}

searchInput.addEventListener("input", function () {
  renderLeaderboard();
});

sortSelect.addEventListener("change", function () {
  currentSort = sortSelect.value;
  renderLeaderboard();
});

renderLeaderboard();