const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, value) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function decorateResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (value) => sendJson(res, res.statusCode || 200, value);
  res.sendFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
      return sendJson(res, 404, { error: "File not found" });
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(res.statusCode || 200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  };
  return res;
}

function matchRoute(routePath, requestPath) {
  return routePath === requestPath;
}

function createApp() {
  const middlewares = [];
  const routes = [];

  async function runMiddlewares(req, res) {
    for (const middleware of middlewares) {
      const handled = await new Promise((resolve, reject) => {
        res.once("finish", () => resolve(true));
        res.once("close", () => resolve(true));
        middleware(req, res, (error) => (error ? reject(error) : resolve(false)));
        if (res.writableEnded) resolve(true);
      });
      if (handled || res.writableEnded) return true;
    }
    return false;
  }

  const app = async (req, res) => {
    decorateResponse(res);
    const parsedUrl = new URL(req.url, "http://localhost");
    req.path = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());

    try {
      const handledByMiddleware = await runMiddlewares(req, res);
      if (handledByMiddleware || res.writableEnded) return;

      const route = routes.find((item) => item.method === req.method && matchRoute(item.path, req.path));
      if (!route) return sendJson(res, 404, { error: "Not found" });
      await route.handler(req, res);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  };

  app.use = (middleware) => middlewares.push(middleware);
  app.get = (routePath, handler) => routes.push({ method: "GET", path: routePath, handler });
  app.post = (routePath, handler) => routes.push({ method: "POST", path: routePath, handler });
  app.listen = (port, callback) => http.createServer(app).listen(port, callback);

  return app;
}

createApp.json = () => async (req, res, next) => {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
  });
  req.on("end", () => {
    try {
      req.body = raw ? JSON.parse(raw) : {};
      next();
    } catch (error) {
      res.status(400).json({ error: "Invalid JSON body." });
    }
  });
};

createApp.static = (rootDir) => async (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  const requestPath = req.path === "/" ? "/index.html" : req.path;
  const safePath = path.normalize(requestPath).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(rootDir, safePath);

  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return next();
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
};

module.exports = createApp;
