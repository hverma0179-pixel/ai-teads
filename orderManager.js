const brokerMock = require("./brokerMock");
const brokerUpstox = require("./brokerUpstox");
const brokerAngelOne = require("./brokerAngelOne");
const logger = require("./logger");
const riskGuard = require("./riskGuard");
const storage = require("./storage");

function chooseBroker(settings) {
  if (settings.paperTrading) return brokerMock;
  if (settings.broker === "upstox") return brokerUpstox;
  if (settings.broker === "angelone") return brokerAngelOne;
  return brokerMock;
}

async function executeDecision({ stock, voteResult, quantity, settings }) {
  const risk = riskGuard.checkTradeRisk({ stock, voteResult, quantity, settings });

  if (!risk.allowed) {
    const blocked = {
      id: `trade_${Date.now()}`,
      createdAt: new Date().toISOString(),
      symbol: stock.symbol,
      side: voteResult.decision,
      quantity,
      status: "BLOCKED",
      mode: risk.mode,
      confidence: voteResult.confidence,
      blocks: risk.blocks,
      voteResult
    };
    storage.addTrade(blocked);
    logger.warn("Trade blocked by risk guard", { symbol: stock.symbol, blocks: risk.blocks });
    return { executed: false, risk, trade: blocked };
  }

  const broker = chooseBroker(settings);
  const order = await broker.placeOrder({
    stock,
    side: voteResult.decision,
    quantity,
    stopLoss: voteResult.tradePlan.stopLoss,
    target: voteResult.tradePlan.target,
    settings
  });

  const trade = storage.addTrade({
    id: `trade_${Date.now()}`,
    createdAt: new Date().toISOString(),
    symbol: stock.symbol,
    side: voteResult.decision,
    quantity,
    status: "OPEN",
    mode: risk.mode,
    broker: order.broker,
    brokerOrderId: order.brokerOrderId,
    entryPrice: order.entryPrice,
    livePrice: order.entryPrice,
    stopLoss: order.stopLoss,
    target: order.target,
    confidence: voteResult.confidence,
    unrealizedPnl: 0,
    realizedPnl: 0,
    voteResult
  });

  logger.info("Trade opened", {
    symbol: trade.symbol,
    side: trade.side,
    mode: trade.mode,
    quantity: trade.quantity
  });

  return { executed: true, risk, order, trade };
}

module.exports = {
  executeDecision
};
