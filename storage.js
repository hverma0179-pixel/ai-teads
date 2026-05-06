const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const settingsFile = path.join(dataDir, "settings.json");
const tradesFile = path.join(dataDir, "trades.json");
const logsFile = path.join(dataDir, "logs.json");

const defaultSettings = {
  phone: "",
  email: "",
  broker: "mock",
  brokerApiKey: "",
  brokerApiSecret: "",
  brokerAccessToken: "",
  aiApiKeys: Array.from({ length: 10 }, () => ""),
  paperTrading: true,
  realTrading: false,
  directTrade: false,
  emergencyStop: false,
  maxTradeValue: 25000,
  dailyLossLimit: 1000,
  minConfidence: 0.68
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readJson(file, fallback) {
  ensureDataDir();
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function getSettings() {
  const saved = readJson(settingsFile, {});
  return {
    ...defaultSettings,
    ...saved,
    aiApiKeys: Array.from({ length: 10 }, (_, index) => saved.aiApiKeys?.[index] || "")
  };
}

function saveSettings(settings) {
  writeJson(settingsFile, settings);
}

function getTrades() {
  return readJson(tradesFile, []);
}

function saveTrades(trades) {
  writeJson(tradesFile, trades);
}

function addTrade(trade) {
  const trades = getTrades();
  trades.push(trade);
  saveTrades(trades);
  return trade;
}

function getLogs() {
  return readJson(logsFile, []);
}

function addLog(entry) {
  const logs = getLogs();
  logs.push(entry);
  writeJson(logsFile, logs.slice(-500));
  return entry;
}

function getTodayDateKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function refreshOpenTrades(getLivePrice) {
  const trades = getTrades();
  let changed = false;

  const updatedTrades = trades.map((trade) => {
    if (trade.status !== "OPEN") return trade;

    const livePrice = getLivePrice(trade.symbol);
    const direction = trade.side === "BUY" ? 1 : -1;
    const unrealizedPnl = Number(((livePrice - trade.entryPrice) * trade.quantity * direction).toFixed(2));
    const shouldHitStop = trade.side === "BUY" ? livePrice <= trade.stopLoss : livePrice >= trade.stopLoss;
    const shouldHitTarget = trade.side === "BUY" ? livePrice >= trade.target : livePrice <= trade.target;

    const nextTrade = {
      ...trade,
      livePrice,
      unrealizedPnl,
      updatedAt: new Date().toISOString()
    };

    if (shouldHitStop || shouldHitTarget) {
      nextTrade.status = "CLOSED";
      nextTrade.exitPrice = livePrice;
      nextTrade.realizedPnl = unrealizedPnl;
      nextTrade.closeReason = shouldHitStop ? "STOP_LOSS" : "TARGET";
      nextTrade.closedAt = new Date().toISOString();
    }

    changed = true;
    return nextTrade;
  });

  if (changed) saveTrades(updatedTrades);
  return {
    trades: updatedTrades,
    pnl: getPnlSummary(updatedTrades)
  };
}

function getPnlSummary(existingTrades) {
  const trades = existingTrades || getTrades();
  const todayKey = getTodayDateKey();

  return trades.reduce(
    (summary, trade) => {
      const realized = Number(trade.realizedPnl || 0);
      const unrealized = Number(trade.unrealizedPnl || 0);
      const tradeDate = new Date(trade.createdAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

      summary.totalTrades += 1;
      summary.openTrades += trade.status === "OPEN" ? 1 : 0;
      summary.realizedPnl += realized;
      summary.unrealizedPnl += unrealized;
      if (tradeDate === todayKey) summary.dailyPnl += realized + unrealized;
      return summary;
    },
    {
      totalTrades: 0,
      openTrades: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      dailyPnl: 0
    }
  );
}

module.exports = {
  addLog,
  addTrade,
  defaultSettings,
  getLogs,
  getPnlSummary,
  getSettings,
  getTrades,
  refreshOpenTrades,
  saveSettings,
  saveTrades
};
