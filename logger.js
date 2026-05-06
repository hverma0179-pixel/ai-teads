const storage = require("./storage");

function write(level, message, meta = {}) {
  const entry = {
    id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    time: new Date().toISOString(),
    level,
    message,
    meta
  };

  storage.addLog(entry);
  const line = `[${entry.time}] ${level.toUpperCase()} ${message}`;
  if (level === "error") {
    console.error(line, meta);
  } else {
    console.log(line, meta);
  }
  return entry;
}

module.exports = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta)
};
