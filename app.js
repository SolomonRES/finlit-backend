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

async function getYahooAuth() {
  const now = Date.now();
  if (yahooCookie && yahooCrumb && now < yahooAuthExpiry) {
    return { cookie: yahooCookie, crumb: yahooCrumb };
  }
  const cookieRes = await fetch("https://fc.yahoo.com", { redirect: "manual" });
  const setCookie = cookieRes.headers.get("set-cookie") || "";
  yahooCookie = setCookie.split(";")[0];
  const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": "Mozilla/5.0", Cookie: yahooCookie },
  });
  yahooCrumb = await crumbRes.text();
  yahooAuthExpiry = now + 10 * 60 * 1000; // cache 10 min
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
  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: cookie },
    });
    if (!response.ok) {
      // If auth expired, clear cache and retry once
      yahooCookie = null;
      yahooCrumb = null;
      yahooAuthExpiry = 0;
      const retry = await getYahooAuth();
      const retryUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(retry.crumb)}`;
      const retryRes = await fetch(retryUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Cookie: retry.cookie },
      });
      if (!retryRes.ok) throw new Error(`Yahoo API ${retryRes.status}`);
      const retryData = await retryRes.json();
      return res.json(retryData.quoteResponse?.result || []);
    }
    const data = await response.json();
    res.json(data.quoteResponse?.result || []);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch market data" });
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`FinLit API server running on port ${PORT}`);
});
