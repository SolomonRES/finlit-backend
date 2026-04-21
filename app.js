const express = require("express");
const cors = require("cors");
const Joi = require("joi");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const WatchlistEntry = require("./mongo");

const app = express();

// Ensure uploads directory exists (Render wipes filesystem on restart)
fs.mkdirSync("public/uploads", { recursive: true });

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

const courses = require("./data/modules.json");

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
  return schema.validate(entry, { abortEarly: false, convert: true });
}

// Multer — store uploads in public/uploads/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "public/uploads/"),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

// GET all courses
app.get("/api/courses", (_req, res) => {
  res.json(courses);
});

// GET courses filtered by domain key
app.get("/api/courses/domain/:key", (req, res) => {
  const filtered = courses.filter((c) => c.domain_key === req.params.key);
  if (filtered.length === 0)
    return res.status(404).json({ error: "No courses found for that domain" });
  res.json(filtered);
});

// GET single course by ID
app.get("/api/courses/:id", (req, res) => {
  const course = courses.find((c) => c._id === parseInt(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found" });
  res.json(course);
});

// GET all watchlist entries
app.get("/api/watchlist", async (_req, res) => {
  try {
    const entries = await WatchlistEntry.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
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
  if (yahooCookie && yahooCrumb && now < yahooAuthExpiry)
    return { cookie: yahooCookie, crumb: yahooCrumb };

  const cookieRes = await fetch("https://finance.yahoo.com", {
    headers: { ...YF_HEADERS, Accept: "text/html,application/xhtml+xml" },
  });
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
  if (!symbols || typeof symbols !== "string" || symbols.length > 300)
    return res.status(400).json({ error: "Provide a valid 'symbols' query param" });
  if (!/^[A-Za-z0-9^=.,\-]+$/.test(symbols))
    return res.status(400).json({ error: "Invalid characters in symbols" });

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

  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, { headers: { ...YF_HEADERS, Cookie: cookie } });
    if (response.ok) {
      const data = await response.json();
      const results = data.quoteResponse?.result || [];
      if (results.length > 0) return res.json(results);
    }
    yahooCookie = null; yahooCrumb = null; yahooAuthExpiry = 0;
  } catch { /* fall through */ }

  try {
    const { cookie, crumb } = await getYahooAuth();
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}`;
    const response = await fetch(url, { headers: { ...YF_HEADERS, Cookie: cookie } });
    if (!response.ok) throw new Error(`Yahoo ${response.status}`);
    const data = await response.json();
    return res.json(data.quoteResponse?.result || []);
  } catch {
    return res.status(502).json({ error: "Failed to fetch market data" });
  }
});

// POST new watchlist entry (with optional image)
app.post("/api/watchlist", upload.single("image"), async (req, res) => {
  const { error } = validateWatchlistEntry({
    ...req.body,
    targetPrice: Number(req.body.targetPrice),
  });
  if (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: error.details.map((d) => d.message) });
  }

  try {
    const entry = new WatchlistEntry({
      symbol: req.body.symbol.toUpperCase(),
      name: req.body.name,
      targetPrice: Number(req.body.targetPrice),
      notes: req.body.notes || "",
      sector: req.body.sector,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : "",
    });
    const saved = await entry.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to save entry" });
  }
});

// PUT update a watchlist entry (with optional new image)
app.put("/api/watchlist/:id", upload.single("image"), async (req, res) => {
  const { error } = validateWatchlistEntry({
    ...req.body,
    targetPrice: Number(req.body.targetPrice),
  });
  if (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: error.details.map((d) => d.message) });
  }

  try {
    const existing = await WatchlistEntry.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Entry not found" });

    // Delete old image file if a new one was uploaded
    if (req.file && existing.imageUrl) {
      const oldPath = path.join("public", existing.imageUrl);
      fs.unlink(oldPath, () => {});
    }

    existing.symbol = req.body.symbol.toUpperCase();
    existing.name = req.body.name;
    existing.targetPrice = Number(req.body.targetPrice);
    existing.notes = req.body.notes || "";
    existing.sector = req.body.sector;
    if (req.file) existing.imageUrl = `/uploads/${req.file.filename}`;

    const updated = await existing.save();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// DELETE a watchlist entry
app.delete("/api/watchlist/:id", async (req, res) => {
  try {
    const entry = await WatchlistEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: "Entry not found" });

    // Clean up image file from disk
    if (entry.imageUrl) {
      const filePath = path.join("public", entry.imageUrl);
      fs.unlink(filePath, () => {});
    }

    res.json({ message: "Entry deleted successfully" });
  } catch {
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`FinLit API server running on port ${PORT}`);
});
