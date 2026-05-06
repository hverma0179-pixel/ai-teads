const DEFAULT_AGENT_NAMES = [
  "Trend AI",
  "News AI",
  "Volume AI",
  "Risk AI",
  "Swing AI",
  "Scalper AI",
  "Macro AI",
  "Support AI",
  "Breakout AI",
  "Value AI"
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreStockForAgent(stock, agentIndex) {
  const personality = (agentIndex - 4.5) / 10;
  return (
    stock.momentum * 0.42 +
    stock.newsSentiment * 0.32 +
    (stock.volumeSignal === "High" ? 0.18 : stock.volumeSignal === "Low" ? -0.1 : 0.04) -
    stock.volatility * 0.08 +
    personality * 0.12
  );
}

function decisionFromScore(score) {
  if (score > 0.18) return "BUY";
  if (score < -0.18) return "SELL";
  return "HOLD";
}

async function askOneAgent({ stock, settings, index }) {
  const hasApiKey = Boolean(settings.aiApiKeys[index]);
  const waitMs = 120 + Math.floor(Math.random() * 650);
  await delay(waitMs);

  const score = scoreStockForAgent(stock, index);
  const decision = decisionFromScore(score);
  const confidence = Math.min(0.94, Math.max(0.45, Math.abs(score) + 0.55));

  return {
    agent: DEFAULT_AGENT_NAMES[index],
    usingApiKey: hasApiKey,
    decision,
    confidence: Number(confidence.toFixed(2)),
    reason:
      decision === "BUY"
        ? "Positive momentum and sentiment are stronger than volatility."
        : decision === "SELL"
          ? "Momentum and sentiment are weak compared with risk."
          : "Signals are mixed, so waiting is safer."
  };
}

function buildTradePlan(stock, decision) {
  const riskPercent = stock.volatility > 1.2 ? 0.009 : 0.012;
  const rewardPercent = stock.volatility > 1.2 ? 0.018 : 0.022;

  if (decision === "SELL") {
    return {
      entryPrice: stock.price,
      stopLoss: Number((stock.price * (1 + riskPercent)).toFixed(2)),
      target: Number((stock.price * (1 - rewardPercent)).toFixed(2))
    };
  }

  return {
    entryPrice: stock.price,
    stopLoss: Number((stock.price * (1 - riskPercent)).toFixed(2)),
    target: Number((stock.price * (1 + rewardPercent)).toFixed(2))
  };
}

async function researchAndVote({ stock, settings, maxMs = 19000 }) {
  const startedAt = Date.now();
  const agentPromises = DEFAULT_AGENT_NAMES.map((_, index) => askOneAgent({ stock, settings, index }));
  const timeout = delay(maxMs).then(() => "TIMEOUT");
  const result = await Promise.race([Promise.allSettled(agentPromises), timeout]);

  const votes =
    result === "TIMEOUT"
      ? []
      : result.filter((item) => item.status === "fulfilled").map((item) => item.value);

  const counts = votes.reduce(
    (summary, vote) => {
      summary[vote.decision] += 1;
      return summary;
    },
    { BUY: 0, SELL: 0, HOLD: 0 }
  );

  const rankedDecision = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const avgConfidence =
    votes.length === 0
      ? 0
      : votes.reduce((sum, vote) => sum + vote.confidence, 0) / votes.length;
  const confidence = Number(avgConfidence.toFixed(2));
  const decision = confidence >= settings.minConfidence ? rankedDecision : "HOLD";
  const tradePlan = buildTradePlan(stock, decision);

  return {
    symbol: stock.symbol,
    decision,
    rawDecision: rankedDecision,
    confidence,
    minConfidence: settings.minConfidence,
    counts,
    votes,
    tradePlan,
    durationMs: Date.now() - startedAt,
    note:
      decision === "HOLD" && rankedDecision !== "HOLD"
        ? "AI confidence is below the minimum, so trade is blocked."
        : "Voting completed."
  };
}

module.exports = {
  researchAndVote
};
