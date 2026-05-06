const state = {
  dashboard: null,
  settings: null,
  lastVote: null
};

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

function money(value) {
  const number = Number(value || 0);
  return `Rs ${number.toFixed(2)}`;
}

function shortTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setPnl(element, value) {
  element.textContent = money(value);
  element.classList.toggle("positive", Number(value) > 0);
  element.classList.toggle("negative", Number(value) < 0);
}

function renderDashboard(data) {
  state.dashboard = data;
  state.settings = data.settings;

  const totalPnl = Number(data.pnl.realizedPnl || 0) + Number(data.pnl.unrealizedPnl || 0);
  setPnl(qs("#totalPnl"), totalPnl);
  setPnl(qs("#dailyPnl"), data.pnl.dailyPnl);
  qs("#openTrades").textContent = data.pnl.openTrades;
  qs("#totalTrades").textContent = data.pnl.totalTrades;
  qs("#tradeCountLabel").textContent = `${data.trades.length} records`;

  qs("#marketHours").textContent = data.market.marketHours;
  qs("#marketStatus").textContent = data.market.isOpen ? "Market Open" : "Market Closed";
  qs("#marketStatus").className = `market-pill ${data.market.isOpen ? "open" : "closed"}`;
  qs("#modeLabel").textContent = data.settings.paperTrading ? "Paper Trading" : data.settings.realTrading ? "Real Trading" : "Trading Off";
  qs("#safetyCopy").textContent = data.settings.emergencyStop
    ? "Emergency stop is on. All new trades are blocked."
    : "Real trading and direct trade are off by default.";

  renderWatchlist(data.watchlist);
  renderTrades(data.trades);
  renderLogs(data.logs);
  fillSettings(data.settings);
}

function renderWatchlist(stocks) {
  qs("#watchlist").innerHTML = stocks
    .map(
      (stock) => `
        <div class="stock-row">
          <div><strong>${stock.symbol}</strong><span>${stock.name} · ${stock.sector}</span></div>
          <div><strong>${money(stock.price)}</strong><span>Price</span></div>
          <div><strong>${stock.momentum}</strong><span>Momentum</span></div>
          <div><strong>${stock.volumeSignal}</strong><span>Volume</span></div>
        </div>
      `
    )
    .join("");
}

function renderTrades(trades) {
  const body = qs("#tradesTable");
  if (!trades.length) {
    body.innerHTML = `<tr><td colspan="10">No trades yet. Run AI research and paper trade first.</td></tr>`;
    return;
  }

  body.innerHTML = trades
    .map((trade) => {
      const pnl = Number(trade.realizedPnl || trade.unrealizedPnl || 0);
      const blockTitle = trade.blocks?.length ? ` title="${trade.blocks.join(" | ")}"` : "";
      return `
        <tr${blockTitle}>
          <td>${shortTime(trade.createdAt)}</td>
          <td>${trade.symbol}</td>
          <td><span class="status ${String(trade.side).toLowerCase()}">${trade.side}</span></td>
          <td>${trade.mode}</td>
          <td><span class="status ${String(trade.status).toLowerCase()}">${trade.status}</span></td>
          <td>${trade.entryPrice ? money(trade.entryPrice) : "-"}</td>
          <td>${trade.livePrice ? money(trade.livePrice) : "-"}</td>
          <td>${trade.stopLoss ? money(trade.stopLoss) : "-"}</td>
          <td>${trade.target ? money(trade.target) : "-"}</td>
          <td class="${pnl >= 0 ? "positive" : "negative"}">${money(pnl)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderLogs(logs) {
  const list = qs("#logsList");
  if (!logs.length) {
    list.innerHTML = `<div class="log-item"><strong>No logs yet</strong><p>System events will appear here.</p></div>`;
    return;
  }

  list.innerHTML = logs
    .map(
      (log) => `
        <div class="log-item">
          <strong>${log.level.toUpperCase()} · ${shortTime(log.time)}</strong>
          <p>${log.message}</p>
        </div>
      `
    )
    .join("");
}

function renderVote(voteResult, durationMs) {
  state.lastVote = voteResult;
  const decisionCard = qs("#decisionCard");
  decisionCard.className = "decision-card";
  decisionCard.innerHTML = `
    <span>Decision</span>
    <strong class="${voteResult.decision.toLowerCase()}">${voteResult.decision}</strong>
    <p>${Math.round(voteResult.confidence * 100)}% confidence · Stop ${money(voteResult.tradePlan.stopLoss)} · Target ${money(voteResult.tradePlan.target)}</p>
  `;

  const total = Math.max(1, voteResult.votes.length);
  qs("#buyCount").textContent = voteResult.counts.BUY;
  qs("#sellCount").textContent = voteResult.counts.SELL;
  qs("#holdCount").textContent = voteResult.counts.HOLD;
  qs("#buyBar").style.width = `${(voteResult.counts.BUY / total) * 100}%`;
  qs("#sellBar").style.width = `${(voteResult.counts.SELL / total) * 100}%`;
  qs("#holdBar").style.width = `${(voteResult.counts.HOLD / total) * 100}%`;
  qs("#buyBar").style.background = "var(--buy)";
  qs("#sellBar").style.background = "var(--sell)";
  qs("#holdBar").style.background = "var(--hold)";
  qs("#durationLabel").textContent = `Completed in ${(durationMs / 1000).toFixed(1)} seconds`;

  qs("#votesList").innerHTML = voteResult.votes
    .map(
      (vote) => `
        <div class="vote-item">
          <strong>${vote.agent}: ${vote.decision} · ${Math.round(vote.confidence * 100)}%</strong>
          <p>${vote.reason}${vote.usingApiKey ? " API key saved." : " Simulated local vote."}</p>
        </div>
      `
    )
    .join("");
}

function fillSettings(settings) {
  qs("#phoneInput").value = settings.phone || "";
  qs("#emailInput").value = settings.email || "";
  qs("#brokerInput").value = settings.broker || "mock";
  qs("#brokerApiKeyInput").value = settings.brokerApiKey || "";
  qs("#brokerApiSecretInput").value = settings.brokerApiSecret || "";
  qs("#brokerAccessTokenInput").value = settings.brokerAccessToken || "";
  qs("#paperTradingInput").checked = Boolean(settings.paperTrading);
  qs("#realTradingInput").checked = Boolean(settings.realTrading);
  qs("#directTradeInput").checked = Boolean(settings.directTrade);
  qs("#emergencyStopInput").checked = Boolean(settings.emergencyStop);
  qs("#maxTradeValueInput").value = settings.maxTradeValue;
  qs("#dailyLossLimitInput").value = settings.dailyLossLimit;
  qs("#minConfidenceInput").value = settings.minConfidence;

  const grid = qs("#aiKeysGrid");
  if (!grid.children.length) {
    grid.innerHTML = Array.from({ length: 10 }, (_, index) => {
      return `<label>AI API key ${index + 1}<input class="ai-key-input" data-index="${index}" placeholder="Paste key ${index + 1}" /></label>`;
    }).join("");
  }

  qsa(".ai-key-input").forEach((input, index) => {
    input.value = settings.aiApiKeys?.[index] || "";
  });
}

async function loadDashboard() {
  const data = await api("/api/dashboard");
  renderDashboard(data);
}

function bindNavigation() {
  qsa(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      qsa(".nav-item").forEach((item) => item.classList.remove("active"));
      qsa(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      qs(`#${button.dataset.view}View`).classList.add("active");
      qs("#pageTitle").textContent =
        button.dataset.view === "dashboard"
          ? "AI Trading Dashboard"
          : button.dataset.view === "research"
            ? "AI Research and Voting"
            : button.dataset.view === "settings"
              ? "Settings"
              : "Logs";
    });
  });
}

async function runResearch() {
  const symbol = qs("#symbolInput").value.trim().toUpperCase();
  qs("#durationLabel").textContent = "AI agents are voting...";
  const result = await api("/api/research", {
    method: "POST",
    body: JSON.stringify({ symbol })
  });
  renderVote(result.voteResult, result.durationMs);
}

async function runTrade() {
  const symbol = qs("#symbolInput").value.trim().toUpperCase();
  const quantity = Number(qs("#quantityInput").value || 1);
  qs("#durationLabel").textContent = "Voting and checking risk...";
  const result = await api("/api/trade", {
    method: "POST",
    body: JSON.stringify({ symbol, quantity })
  });
  renderVote(result.trade.voteResult, result.trade.voteResult.durationMs || 0);
  alert(result.executed ? "Paper trade opened." : `Trade blocked: ${result.risk.blocks.join(", ")}`);
  await loadDashboard();
}

async function saveSettings(event) {
  event.preventDefault();
  const aiApiKeys = qsa(".ai-key-input").map((input) => input.value.trim());
  const payload = {
    phone: qs("#phoneInput").value.trim(),
    email: qs("#emailInput").value.trim(),
    broker: qs("#brokerInput").value,
    brokerApiKey: qs("#brokerApiKeyInput").value.trim(),
    brokerApiSecret: qs("#brokerApiSecretInput").value.trim(),
    brokerAccessToken: qs("#brokerAccessTokenInput").value.trim(),
    aiApiKeys,
    paperTrading: qs("#paperTradingInput").checked,
    realTrading: qs("#realTradingInput").checked,
    directTrade: qs("#directTradeInput").checked,
    emergencyStop: qs("#emergencyStopInput").checked,
    maxTradeValue: Number(qs("#maxTradeValueInput").value),
    dailyLossLimit: Number(qs("#dailyLossLimitInput").value),
    minConfidence: Number(qs("#minConfidenceInput").value)
  };

  const saved = await api("/api/settings", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  alert("Settings saved.");
  renderDashboard({ ...state.dashboard, settings: saved });
}

async function requestOtp() {
  const payload = {
    phone: qs("#phoneInput").value.trim(),
    email: qs("#emailInput").value.trim()
  };
  const result = await api("/api/auth/request-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  qs("#otpMessage").textContent = result.devOtp
    ? `Development OTP: ${result.devOtp}`
    : result.message;
}

async function verifyOtp() {
  const payload = {
    phone: qs("#phoneInput").value.trim(),
    email: qs("#emailInput").value.trim(),
    otp: qs("#otpInput").value.trim()
  };
  const result = await api("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  qs("#otpMessage").textContent = result.message;
}

function bindActions() {
  qs("#refreshBtn").addEventListener("click", loadDashboard);
  qs("#researchBtn").addEventListener("click", () => runResearch().catch((error) => alert(error.message)));
  qs("#tradeBtn").addEventListener("click", () => runTrade().catch((error) => alert(error.message)));
  qs("#settingsForm").addEventListener("submit", (event) => saveSettings(event).catch((error) => alert(error.message)));
  qs("#requestOtpBtn").addEventListener("click", () => requestOtp().catch((error) => alert(error.message)));
  qs("#verifyOtpBtn").addEventListener("click", () => verifyOtp().catch((error) => alert(error.message)));
  qs("#emergencyStopBtn").addEventListener("click", async () => {
    await api("/api/emergency-stop", { method: "POST", body: JSON.stringify({}) });
    alert("Emergency stop enabled.");
    await loadDashboard();
  });
}

async function boot() {
  bindNavigation();
  bindActions();
  await loadDashboard();
  setInterval(() => loadDashboard().catch(() => {}), 10000);
}

boot().catch((error) => {
  document.body.innerHTML = `<main class="content"><section class="panel"><h2>App failed to load</h2><p>${error.message}</p></section></main>`;
});
