const marketData = require("./marketData");
const storage = require("./storage");

function hasValidStopLoss(side, entryPrice, stopLoss) {
  if (!stopLoss || stopLoss <= 0) return false;
  if (side === "BUY") return stopLoss < entryPrice;
  if (side === "SELL") return stopLoss > entryPrice;
  return false;
}

function checkTradeRisk({ stock, voteResult, quantity, settings }) {
  const blocks = [];
  const market = marketData.getMarketStatus();
  const pnl = storage.getPnlSummary();
  const decision = voteResult.decision;
  const entryPrice = voteResult.tradePlan.entryPrice;
  const stopLoss = voteResult.tradePlan.stopLoss;
  const tradeValue = entryPrice * quantity;

  if (settings.emergencyStop) blocks.push("Emergency stop is ON.");
  if (!market.isOpen) blocks.push("Indian market is closed.");
  if (pnl.dailyPnl <= -Math.abs(settings.dailyLossLimit)) blocks.push("Daily loss limit is reached.");
  if (decision === "HOLD") blocks.push("Decision is HOLD.");
  if (voteResult.confidence < settings.minConfidence) blocks.push("AI confidence is low.");
  if (!hasValidStopLoss(decision, entryPrice, stopLoss)) blocks.push("Valid stop loss is required.");
  if (tradeValue > settings.maxTradeValue) blocks.push("Trade value is above max trade value.");
  if (settings.realTrading && (!settings.directTrade || settings.paperTrading)) {
    blocks.push("Real trading needs paper mode OFF and direct trade ON.");
  }
  if (!settings.paperTrading && !settings.realTrading) {
    blocks.push("No trading mode is enabled.");
  }

  return {
    allowed: blocks.length === 0,
    blocks,
    market,
    pnl,
    tradeValue: Number(tradeValue.toFixed(2)),
    mode: settings.paperTrading ? "PAPER" : settings.realTrading ? "REAL" : "OFF"
  };
}

module.exports = {
  checkTradeRisk
};
