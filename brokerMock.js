async function placeOrder({ stock, side, quantity, stopLoss, target }) {
  return {
    broker: "mock",
    brokerOrderId: `PAPER_${Date.now()}`,
    status: "FILLED",
    symbol: stock.symbol,
    side,
    quantity,
    entryPrice: stock.price,
    stopLoss,
    target,
    filledAt: new Date().toISOString(),
    message: "Paper order filled by mock broker."
  };
}

module.exports = {
  placeOrder
};
