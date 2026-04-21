const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MongoDB_URI)
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

const watchlistSchema = new mongoose.Schema(
  {
    symbol:      { type: String, required: true, trim: true, uppercase: true },
    name:        { type: String, required: true, trim: true },
    targetPrice: { type: Number, required: true },
    notes:       { type: String, default: "" },
    sector:      { type: String, required: true },
    imageUrl:    { type: String, default: "" },
  },
  { timestamps: true }
);

const WatchlistEntry = mongoose.model("WatchlistEntry", watchlistSchema);

module.exports = WatchlistEntry;
