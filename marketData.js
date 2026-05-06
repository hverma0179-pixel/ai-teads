const WATCHLIST = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", basePrice: 2880 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", basePrice: 3920 },
  { symbol: "INFY", name: "Infosys", sector: "IT", basePrice: 1480 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", basePrice: 1625 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", basePrice: 1110 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", basePrice: 805 },
  { symbol: "LT", name: "Larsen and Toubro", sector: "Infrastructure", basePrice: 3540 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", basePrice: 12400 }
];

function getIstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getMarketStatus(date = new Date()) {
  const parts = getIstParts(date);
  const weekday = parts.weekday;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const minutes = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const isOpen = isWeekday && minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;

  return {
    exchange: "NSE",
    timezone: "Asia/Kolkata",
    isOpen,
    message: isOpen ? "Indian market is open." : "Indian market is closed.",
    marketHours: "Monday-Friday, 09:15-15:30 IST"
  };
}

function numberFromSymbol(symbol, salt = 0) {
  return symbol.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1 + salt), 0);
}

function getLivePrice(symbol) {
  const stock = WATCHLIST.find((item) => item.symbol === symbol) || WATCHLIST[0];
  const nowBucket = Math.floor(Date.now() / 15000);
  const wave = Math.sin((numberFromSymbol(symbol) + nowBucket) / 5);
  const drift = Math.cos((numberFromSymbol(symbol, 3) + nowBucket) / 7);
  const movePercent = (wave * 0.65 + drift * 0.35) / 100;
  return Number((stock.basePrice * (1 + movePercent)).toFixed(2));
}

function researchIndianStocks(symbols) {
  const wanted = symbols?.length ? symbols : WATCHLIST.map((item) => item.symbol);

  return wanted.map((symbol) => {
    const known = WATCHLIST.find((item) => item.symbol === symbol) || {
      symbol,
      name: symbol,
      sector: "Unknown",
      basePrice: 1000
    };
    const seed = numberFromSymbol(symbol);
    const price = getLivePrice(symbol);
    const momentum = Number((((seed % 17) - 8) / 10).toFixed(2));
    const volatility = Number((0.7 + (seed % 9) / 10).toFixed(2));
    const volumeSignal = ["Low", "Normal", "High"][seed % 3];
    const newsSentiment = Number((((seed % 23) - 11) / 11).toFixed(2));
    const support = Number((price * (1 - (1.1 + (seed % 3)) / 100)).toFixed(2));
    const resistance = Number((price * (1 + (1.4 + (seed % 4)) / 100)).toFixed(2));

    return {
      ...known,
      price,
      momentum,
      volatility,
      volumeSignal,
      newsSentiment,
      support,
      resistance,
      researchedAt: new Date().toISOString()
    };
  });
}

module.exports = {
  WATCHLIST,
  getLivePrice,
  getMarketStatus,
  researchIndianStocks
};
