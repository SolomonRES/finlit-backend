const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

const courses = [
  {
    "_id": 1,
    "title": "M&A Fundamentals",
    "description": "Introduction to mergers and acquisitions process",
    "domain": "Investment Banking",
    "domain_key": "ib",
    "duration": 45,
    "status": "completed",
    "img_name": "assets/ma-fundamentals.png"
  },
  {
    "_id": 2,
    "title": "Valuation Methods",
    "description": "DCF, Comparable Companies, Precedent Transactions",
    "domain": "Investment Banking",
    "domain_key": "ib",
    "duration": 60,
    "status": "completed",
    "img_name": "assets/valuation-methods.png"
  },
  {
    "_id": 3,
    "title": "Deal Structuring",
    "description": "Transaction structures and negotiation tactics",
    "domain": "Investment Banking",
    "domain_key": "ib",
    "duration": 55,
    "status": "not-completed",
    "img_name": "assets/deal-structuring.png"
  },
  {
    "_id": 4,
    "title": "Debt & Equity Capital Markets",
    "description": "IPOs, follow-ons, and debt issuance",
    "domain": "Investment Banking",
    "domain_key": "ib",
    "duration": 50,
    "status": "locked",
    "img_name": "assets/debt-equity.png"
  },
  {
    "_id": 5,
    "title": "Equity Markets Structure",
    "description": "Exchange mechanics and market participants",
    "domain": "Capital Markets",
    "domain_key": "cm",
    "duration": 40,
    "status": "completed",
    "img_name": "assets/equity-markets.png"
  },
  {
    "_id": 6,
    "title": "Fixed Income Trading",
    "description": "Bond markets, yields, and duration",
    "domain": "Capital Markets",
    "domain_key": "cm",
    "duration": 55,
    "status": "not-completed",
    "img_name": "assets/fixed-income.png"
  },
  {
    "_id": 7,
    "title": "Derivatives & Options",
    "description": "Options, futures, and swap contracts",
    "domain": "Capital Markets",
    "domain_key": "cm",
    "duration": 65,
    "status": "locked",
    "img_name": "assets/derivatives.png"
  },
  {
    "_id": 8,
    "title": "Portfolio Theory",
    "description": "Modern portfolio theory and optimization",
    "domain": "Asset Management",
    "domain_key": "am",
    "duration": 50,
    "status": "not-completed",
    "img_name": "assets/portfolio-theory.png"
  },
  {
    "_id": 9,
    "title": "Hedge Fund Strategies",
    "description": "Long/short, event-driven, and macro strategies",
    "domain": "Asset Management",
    "domain_key": "am",
    "duration": 60,
    "status": "locked",
    "img_name": "assets/hedge-fund.png"
  },
  {
    "_id": 10,
    "title": "Capital Structure",
    "description": "Debt vs equity financing decisions",
    "domain": "Corporate Finance",
    "domain_key": "cf",
    "duration": 45,
    "status": "not-completed",
    "img_name": "assets/capital-structure.png"
  },
  {
    "_id": 11,
    "title": "Corporate Valuation",
    "description": "Enterprise value and equity value",
    "domain": "Corporate Finance",
    "domain_key": "cf",
    "duration": 55,
    "status": "locked",
    "img_name": "assets/corporate-valuation.png"
  },
  {
    "_id": 12,
    "title": "Commercial Real Estate",
    "description": "Property types and investment strategies",
    "domain": "Real Estate Finance",
    "domain_key": "re",
    "duration": 40,
    "status": "not-completed",
    "img_name": "assets/commercial-re.png"
  },
  {
    "_id": 13,
    "title": "Risk Management Fundamentals",
    "description": "Identifying and mitigating financial risks",
    "domain": "Insurance & Risk",
    "domain_key": "ir",
    "duration": 35,
    "status": "not-completed",
    "img_name": "assets/risk-management.png"
  }
];

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`FinLit API server running on port ${PORT}`);
});
