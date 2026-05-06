# Indian Stock AI Trading App

Simple beginner-friendly Node.js + Express app for Indian stock AI research and paper trading.

## What it does

- Researches Indian stocks from a local starter watchlist.
- Runs 10 AI-style voting agents and returns BUY, SELL, or HOLD.
- Finishes the voting flow in under 20 seconds.
- Starts with paper trading ON by default.
- Keeps real trading OFF by default.
- Keeps direct trade OFF by default.
- Checks risk before every trade.
- Blocks trades outside Indian market hours.
- Blocks low-confidence trades.
- Blocks trades after the daily loss limit is reached.
- Blocks trades without a valid stop loss.
- Saves trades and logs in local JSON files.
- Shows dashboard P/L, open trades, voting, settings, logs, and emergency stop.

## Important safety note

This project is a starter app for learning and paper trading only. It is not financial advice. Do not enable real trading until you have tested deeply, reviewed broker API rules, added proper authentication, and understood the risk.

Real broker adapters are intentionally stubbed in:

- `brokerUpstox.js`
- `brokerAngelOne.js`

That means the app is ready to connect later, but it will not place real broker orders in this first version.

## Setup

1. Install Node.js 18 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill keys later if needed.
4. Start the app:

```bash
npm start
```

5. Open:

```text
http://localhost:3000
```

## Default safety settings

```text
Paper trading: ON
Real trading: OFF
Direct trade: OFF
Emergency stop: OFF
Minimum confidence: 0.68
Daily loss limit: Rs 1000
Max trade value: Rs 25000
```

## Login and OTP

The app includes a simple local OTP demo:

- Enter phone or email in Settings.
- Click Send OTP.
- In development mode, the OTP appears on screen and in server logs.
- Verify OTP.

For production, replace this with a real SMS/email provider and proper sessions.

## AI voting

The app has 10 voting agents:

1. Trend AI
2. News AI
3. Volume AI
4. Risk AI
5. Swing AI
6. Scalper AI
7. Macro AI
8. Support AI
9. Breakout AI
10. Value AI

The Settings page accepts 10 AI API keys. In this starter version, the agents simulate research locally so the app runs immediately and reliably. Later, replace `askOneAgent()` in `agent.js` with real AI API calls and keep the same 20-second timeout.

## Risk guard rules

`riskGuard.js` blocks a trade when:

- Emergency stop is ON.
- Indian market is closed.
- Daily loss limit is reached.
- AI decision is HOLD.
- AI confidence is below the minimum.
- Stop loss is missing or invalid.
- Trade value is above the max trade value.
- Real trading is requested without direct trade enabled.

## Broker modes

### Mock broker

`brokerMock.js` fills paper trades locally.

### Upstox

`brokerUpstox.js` is a safe stub. Add official Upstox order API code only after paper testing.

### Angel One SmartAPI

`brokerAngelOne.js` is a safe stub. Add SmartAPI order placement only after paper testing.

## Files

- `server.js` - Express API and static web server.
- `agent.js` - 10-agent voting system.
- `riskGuard.js` - trade safety checks.
- `orderManager.js` - connects AI decision, risk guard, broker, and storage.
- `brokerMock.js` - paper trading broker.
- `brokerUpstox.js` - Upstox adapter stub.
- `brokerAngelOne.js` - Angel One SmartAPI adapter stub.
- `marketData.js` - Indian stock research data.
- `logger.js` - local logs.
- `storage.js` - JSON storage.
- `public/index.html` - dashboard UI.
- `public/style.css` - dashboard styling.
- `public/script.js` - dashboard interactions.
- `.env.example` - environment template.

## Data storage

Runtime data is created in:

```text
data/settings.json
data/trades.json
data/logs.json
```

These files are created automatically when the app runs.

## Next improvements

- Add real market data from a licensed provider.
- Add real AI calls with per-agent timeouts.
- Add proper user accounts and encrypted credential storage.
- Add broker sandbox testing.
- Add trailing stop loss.
- Add backtesting before live trading.
- Add automatic strategy review for losing trades.
- Add deployment security and audit logs.
