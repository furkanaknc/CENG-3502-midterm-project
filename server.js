const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
// Load environment variables from .env file
require("dotenv").config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Serve static files from the public directory
app.use("/public", express.static(path.join(__dirname, "public")));
// Serve root files like index.html
app.use(express.static(path.join(__dirname, "./")));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import routes
const landmarkRoutes = require("./routes/landmarkRoutes");
const visitedRoutes = require("./routes/visitedRoutes");

// Use routes
app.use("/api/landmarks", landmarkRoutes);
app.use("/api/visited", visitedRoutes);

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
