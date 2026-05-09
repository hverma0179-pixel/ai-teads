try {
  require("dotenv").config();
} catch (error) {
  // dotenv optional hai
}

let express;
try {
  express = require("express");
} catch (error) {
  express = require("./simpleExpress");
}

const fs = require("fs");
const path = require("path");

const agent = require("./agent");
const marketData = require("./marketData");
const orderManager = require("./orderManager");
const logger = require("./logger");
const storage = require("./storage");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const indexFile = path.join(publicDir, "index.html");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

const otpStore = new Map();

function sendIndex(req, res) {
  if (!fs.existsSync(indexFile)) {
    return res.status(500).send(`
      <h1>public/index.html missing</h1>
      <p>Create this file in your repo:</p>
      <pre>public/index.html</pre>
    `);
  }

  return res.sendFile(indexFile);
}

function safeSettings(settings) {
  return {
    ...settings,
    aiApiKeys: settings.aiApiKeys.map((key) => (key ? "saved" : "")),
    brokerApiKey: settings.brokerApiKey ? "saved" : "",
    brokerApiSecret: settings.brokerApiSecret ? "saved" : "",
    brokerAccessToken: settings.brokerAccessToken ? "saved" : ""
  };
}

function maskValue(currentValue, newValue) {
  if (newValue === "saved") return currentValue || "";
  return newValue || "";
}

app.get("/", sendIndex);

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Server running" });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "Indian Stock AI Trading App",
    paperTradingDefault: true,
    market: marketData.getMarketStatus()
  });
});

app.post("/api/auth/request-otp", (req, res) => {
  const { phone, email } = req.body || {};

  if (!phone && !email) {
    return res.status(400).json({ error: "Phone number or email is required." });
  }

  const identity = String(phone || email).trim().toLowerCase();
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  otpStore.set(identity, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  logger.info("OTP generated for login", {
    identity,
    otpForLocalDemo: otp
  });

  res.json({
    message: "OTP generated.",
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp
  });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { phone, email, otp } = req.body || {};
  const identity = String(phone || email || "").trim().toLowerCase();
  const record = otpStore.get(identity);

  if (!record || record.expiresAt < Date.now() || record.otp !== String(otp)) {
    return res.status(401).json({ error: "Invalid or expired OTP." });
  }

  otpStore.delete(identity);

  const sessionToken = Buffer.from(`${identity}:${Date.now()}`).toString("base64url");

  logger.info("User logged in with OTP", { identity });

  res.json({
    message: "Login successful.",
    sessionToken
  });
});

app.get("/api/settings", (req, res) => {
  res.json(safeSettings(storage.getSettings()));
});

app.post("/api/settings", (req, res) => {
  const current = storage.getSettings();
  const incoming = req.body || {};

  const settings = {
    ...current,
    phone: incoming.phone ?? current.phone,
    email: incoming.email ?? current.email,
    broker: incoming.broker ?? current.broker,
    brokerApiKey: maskValue(current.brokerApiKey, incoming.brokerApiKey),
    brokerApiSecret: maskValue(current.brokerApiSecret, incoming.brokerApiSecret),
    brokerAccessToken: maskValue(current.brokerAccessToken, incoming.brokerAccessToken),
    aiApiKeys: Array.from({ length: 10 }, (_, index) =>
      maskValue(current.aiApiKeys[index], incoming.aiApiKeys?.[index])
    ),
    paperTrading: incoming.paperTrading !== undefined ? Boolean(incoming.paperTrading) : current.paperTrading,
    realTrading: incoming.realTrading !== undefined ? Boolean(incoming.realTrading) : current.realTrading,
    directTrade: incoming.directTrade !== undefined ? Boolean(incoming.directTrade) : current.directTrade,
    emergencyStop: incoming.emergencyStop !== undefined ? Boolean(incoming.emergencyStop) : current.emergencyStop,
    maxTradeValue: Number(incoming.maxTradeValue || current.maxTradeValue),
    dailyLossLimit: Number(incoming.dailyLossLimit || current.dailyLossLimit),
    minConfidence: Number(incoming.minConfidence || current.minConfidence),
    upiId: incoming.upiId ?? current.upiId ?? "",
    withdrawPhone: incoming.withdrawPhone ?? current.withdrawPhone ?? ""
  };

  if (settings.realTrading && settings.paperTrading) {
    return res.status(400).json({
      error: "Turn paper trading OFF before enabling real trading."
    });
  }

  storage.saveSettings(settings);

  logger.info("Settings updated", {
    broker: settings.broker,
    paperTrading: settings.paperTrading,
    realTrading: settings.realTrading,
    directTrade: settings.directTrade,
    emergencyStop: settings.emergencyStop
  });

  res.json(safeSettings(settings));
});

app.get("/api/market", (req, res) => {
  const symbols = String(req.query.symbols || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);

  res.json({
    status: marketData.getMarketStatus(),
    stocks: marketData.researchIndianStocks(symbols)
  });
});

app.post("/api/research", async (req, res) => {
  const startedAt = Date.now();
  const symbol = String(req.body?.symbol || "RELIANCE").trim().toUpperCase();
  const settings = storage.getSettings();

  try {
    const research = marketData.researchIndianStocks([symbol])[0];

    const voteResult = await agent.researchAndVote({
      stock: research,
      settings,
      maxMs: 19000
    });

    logger.info("AI research completed", {
      symbol,
      decision: voteResult.decision,
      confidence: voteResult.confidence,
      durationMs: Date.now() - startedAt
    });

    res.json({
      durationMs: Date.now() - startedAt,
      research,
      voteResult
    });
  } catch (error) {
    logger.error("AI research failed", {
      symbol,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

app.post("/api/trade", async (req, res) => {
  const symbol = String(req.body?.symbol || "RELIANCE").trim().toUpperCase();
  const quantity = Number(req.body?.quantity || 1);
  const settings = storage.getSettings();

  try {
    const stock = marketData.researchIndianStocks([symbol])[0];

    const voteResult = await agent.researchAndVote({
      stock,
      settings,
      maxMs: 19000
    });

    const result = await orderManager.executeDecision({
      stock,
      voteResult,
      quantity,
      settings
    });

    res.json(result);
  } catch (error) {
    logger.error("Trade flow failed", {
      symbol,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

app.post("/api/emergency-stop", (req, res) => {
  const settings = storage.getSettings();

  settings.emergencyStop = true;
  settings.directTrade = false;

  storage.saveSettings(settings);
  logger.warn("Emergency stop enabled by user");

  res.json({
    message: "Emergency stop is ON. New trades are blocked.",
    settings: safeSettings(settings)
  });
});

app.post("/api/trades/refresh", (req, res) => {
  const updated = storage.refreshOpenTrades(marketData.getLivePrice);
  res.json(updated);
});

app.get("/api/dashboard", (req, res) => {
  storage.refreshOpenTrades(marketData.getLivePrice);

  res.json({
    settings: safeSettings(storage.getSettings()),
    market: marketData.getMarketStatus(),
    pnl: storage.getPnlSummary(),
    trades: storage.getTrades().slice(-50).reverse(),
    logs: storage.getLogs().slice(-80).reverse(),
    watchlist: marketData.researchIndianStocks()
  });
});

app.get("/api/*", (req, res) => {
  res.status(404).json({
    error: "API route not found",
    path: req.path
  });
});

app.get("*", sendIndex);

app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Indian Stock AI Trading App running on port ${PORT}`);
});
