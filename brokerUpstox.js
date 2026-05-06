async function placeOrder({ stock, side, quantity, stopLoss, target, settings }) {
  if (!settings.realTrading || !settings.directTrade) {
    throw new Error("Upstox real order blocked because realTrading/directTrade is disabled.");
  }

  if (!settings.brokerAccessToken) {
    throw new Error("Upstox access token is missing.");
  }

  // Starter stub: wire the official Upstox order endpoint here after testing in sandbox.
  // Keep riskGuard before this call so unsafe orders never reach the broker.
  return {
    broker: "upstox",
    brokerOrderId: `UPSTOX_STUB_${Date.now()}`,
    status: "DRY_RUN",
    symbol: stock.symbol,
    side,
    quantity,
    entryPrice: stock.price,
    stopLoss,
    target,
    message: "Upstox adapter is ready, but live API call is intentionally stubbed."
  };
}

module.exports = {
  placeOrder
};
