async function placeOrder({ stock, side, quantity, stopLoss, target, settings }) {
  if (!settings.realTrading || !settings.directTrade) {
    throw new Error("Angel One real order blocked because realTrading/directTrade is disabled.");
  }

  if (!settings.brokerApiKey || !settings.brokerAccessToken) {
    throw new Error("Angel One SmartAPI key/access token is missing.");
  }

  // Starter stub: wire Angel One SmartAPI order placement here after sandbox testing.
  // Keep riskGuard before this call so unsafe orders never reach the broker.
  return {
    broker: "angelone",
    brokerOrderId: `ANGEL_STUB_${Date.now()}`,
    status: "DRY_RUN",
    symbol: stock.symbol,
    side,
    quantity,
    entryPrice: stock.price,
    stopLoss,
    target,
    message: "Angel One adapter is ready, but live API call is intentionally stubbed."
  };
}

module.exports = {
  placeOrder
};
