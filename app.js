const express = require("express");
const cors = require("cors");
const Joi = require("joi");
const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

const courses = require("./data/modules.json");

/* Watchlist (POST target) */
const watchlist = [];
let watchlistNextId = 1;
const WATCHLIST_TTL = 5 * 60 * 1000; // 5 minutes

const VALID_SECTORS = [
  "Technology",
  "Healthcare",
  "Financials",
  "Energy",
  "Consumer Discretionary",
  "Industrials",
  "Real Estate",
  "Utilities",
  "Materials",
  "Communication Services",
];

function validateWatchlistEntry(entry) {
  const schema = Joi.object({
    symbol: Joi.string()
      .uppercase()
      .min(1)
      .max(5)
      .pattern(/^[A-Z]+$/)
      .required()
      .messages({ "string.pattern.base": '"symbol" must contain only letters (e.g. AAPL)' }),
    name: Joi.string().min(2).max(60).required(),
    targetPrice: Joi.number().positive().precision(2).required(),
    notes: Joi.string().max(200).allow("").optional(),
    sector: Joi.string()
      .valid(...VALID_SECTORS)
      .required(),
  });
  return schema.validate(entry, { abortEarly: false });
}

// Cleanup expired watchlist entries every 60 seconds, people could add weird stuff, just to test if it works
setInterval(() => {
  const now = Date.now();
  for (let i = watchlist.length - 1; i >= 0; i--) {
    if (now - watchlist[i].createdAt > WATCHLIST_TTL) {
      watchlist.splice(i, 1);
    }
  }
}, 60 * 1000);

// GET all courses
app.get("/api/courses", (_req, res) => {
  res.json(courses);
});

// GET courses filtered by domain key - must come before /:id
app.get("/api/courses/domain/:key", (req, res) => {
  const filtered = courses.filter((c) => c.domain_key === req.params.key);
  if (filtered.length === 0) {
    return res.status(404).json({ error: "No courses found for that domain" });
  }
  res.json(filtered);
});

// GET single course by ID
app.get("/api/courses/:id", (req, res) => {
  const course = courses.find((c) => c._id === parseInt(req.params.id));
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }
  res.json(course);
});

// GET watchlist (only non-expired entries)
app.get("/api/watchlist", (_req, res) => {
  const now = Date.now();
  const active = watchlist.filter((w) => now - w.createdAt <= WATCHLIST_TTL);
  res.json(active);
});

// GET market quotes (proxy to Yahoo Finance to avoid CORS)
let yahooCookie = null;
let yahooCrumb = null;
let yahooAuthExpiry = 0;

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://finance.yahoo.com",
  "Origin": "https://finance.yahoo.com",
};

async function getYahooAuth() {
  const now = Date.now();
  if (yahooCookie && yahooCrumb && now < yahooAuthExpiry) {
    return { cookie: yahooCookie, crumb: yahooCrumb };
  }
  // Use finance.yahoo.com (not fc.yahoo.com) — more reliable on server infra
  const cookieRes = await fetch("https://finance.yahoo.com", {
    headers: { ...YF_HEADERS, Accept: "text/html,application/xhtml+xml" },
  });
  // Node 18+ exposes getSetCookie() for multiple Set-Cookie headers
  let cookieParts = [];
  if (typeof cookieRes.headers.getSetCookie === "function") {
    cookieParts = cookieRes.headers.getSetCookie().map((c) => c.split(";")[0]);
  } else {
    const raw = cookieRes.headers.get("set-cookie") || "";
    if (raw) cookieParts = raw.split(",").map((c) => c.split(";")[0].trim()).filter(Boolean);
  }
  yahooCookie = cookieParts.join("; ");
  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { ...YF_HEADERS, Cookie: yahooCookie },
  });
  yahooCrumb = (await crumbRes.text()).trim();
  yahooAuthExpiry = now + 10 * 60 * 1000;
  return { cookie: yahooCookie, crumb: yahooCrumb };
}

app.get("/api/quotes", async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols || typeof symbols !== "string" || symbols.length > 300) {
    return res.status(400).json({ error: "Provide a valid 'symbols' query param" });
  }
  if (!/^[A-Za-z0-9^=.,\-]+$/.test(symbols)) {
    return res.status(400).json({ error: "Invalid characters in symbols" });
  }

  // Attempt 1: no-auth fast path (works when Yahoo allows unauthenticated requests)
  try {
    const directRes = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`,
      { headers: YF_HEADERS }
    );
    if (directRes.ok) {
      const data = await directRes.json();
      const results = data.quoteResponse?.result;
      if (results && results.length > 0) return res.json(results);
    }
  } catch { /* fall through */ }

  // Attempt 2: cookie + crumb on query2
  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, { headers: { ...YF_HEADERS, Cookie: cookie } });
    if (response.ok) {
      const data = await response.json();
      const results = data.quoteResponse?.result || [];
      if (results.length > 0) return res.json(results);
    }
    // Auth may have expired — clear and fall through to attempt 3
    yahooCookie = null; yahooCrumb = null; yahooAuthExpiry = 0;
  } catch { /* fall through */ }

  // Attempt 3: fresh auth on query1 (different Yahoo server)
  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, { headers: { ...YF_HEADERS, Cookie: cookie } });
    if (!response.ok) throw new Error(`Yahoo ${response.status}`);
    const data = await response.json();
    return res.json(data.quoteResponse?.result || []);
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch market data" });
  }
});

// POST new watchlist entry (auto-deletes after 5 minutes)
app.post("/api/watchlist", (req, res) => {
  const { error } = validateWatchlistEntry(req.body);
  if (error) {
    return res.status(400).json({
      error: error.details.map((d) => d.message),
    });
  }

  const entry = {
    _id: watchlistNextId++,
    symbol: req.body.symbol.toUpperCase(),
    name: req.body.name,
    targetPrice: req.body.targetPrice,
    notes: req.body.notes || "",
    sector: req.body.sector,
    createdAt: Date.now(),
    expiresIn: "5 minutes",
  };

  watchlist.push(entry);
  res.status(201).json(entry);
});

// PUT update a watchlist entry
app.put("/api/watchlist/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = watchlist.findIndex((w) => w._id === id);
  if (idx === -1) return res.status(404).json({ error: "Entry not found" });

  const { error } = validateWatchlistEntry(req.body);
  if (error) {
    return res.status(400).json({ error: error.details.map((d) => d.message) });
  }

  watchlist[idx] = {
    ...watchlist[idx],
    symbol: req.body.symbol.toUpperCase(),
    name: req.body.name,
    targetPrice: req.body.targetPrice,
    notes: req.body.notes || "",
    sector: req.body.sector,
  };

  res.json(watchlist[idx]);
});

// DELETE a watchlist entry
app.delete("/api/watchlist/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = watchlist.findIndex((w) => w._id === id);
  if (idx === -1) return res.status(404).json({ error: "Entry not found" });

  watchlist.splice(idx, 1);
  res.json({ message: "Entry deleted successfully" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`FinLit API server running on port ${PORT}`);
});
