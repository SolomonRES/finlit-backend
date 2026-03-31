# FinLit Backend

Node.js + Express API server for [FinLit](https://solomonres.github.io/FinLit/) | Financial Literacy Platform. Serves course data and hosts an interactive API Explorer page styled to match the React frontend.

---

## Live Demo

**API Explorer:** `https://something.onrender.com`  
**Base URL:** `https://something.onrender.com/api`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/courses` | Returns all 13 courses |
| `GET` | `/api/courses/:id` | Returns a single course by numeric ID (1–13) |
| `GET` | `/api/courses/domain/:key` | Returns all courses for a given domain key |

### Domain Keys

| Key | Domain |
|-----|--------|
| `ib` | Investment Banking |
| `cm` | Capital Markets |
| `am` | Asset Management |
| `cf` | Corporate Finance |
| `re` | Real Estate Finance |
| `ir` | Insurance & Risk |

### Example Requests

```
GET /api/courses
GET /api/courses/3
GET /api/courses/domain/ib
```

### Example Response — `/api/courses/1`

```json
{
  "_id": 1,
  "title": "M&A Fundamentals",
  "description": "Introduction to mergers and acquisitions process",
  "domain": "Investment Banking",
  "domain_key": "ib",
  "duration": 45,
  "status": "completed",
  "img_name": "assets/ma-fundamentals.png"
}
```

---

## Project Structure

```
finlit-backend/
├── app.js              # Express server — routes & data
├── mongo.js            # MongoDB connection (reference)
├── package.json
├── public/
│   ├── index.html      # API Explorer page
│   ├── styles.css      # Explorer styles (matches FinLit React theme)
│   └── assets/         # Course images + logo/favicon
│       ├── finlit-logo.png
│       ├── favicon.png
│       └── *.png       # One image per course
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Start server (http://localhost:8080)
npm start

# Start with auto-reload via nodemon
npm run dev
```

Open `http://localhost:8080` in your browser to view the API Explorer.

---

## Deployment Steps (Render)

1. Push this repo to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the **Start Command** to `node app.js`.
4. Render auto-detects the `PORT` environment variable — the server uses `process.env.PORT || 8080`.
5. Update the **Live Demo** links at the top of this README with your Render URL.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Middleware:** CORS, express.json, express.static
- **Hosting:** Render
