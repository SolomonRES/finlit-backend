const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use(cors());

const courses = require("./data/modules.json");

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
