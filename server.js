const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
// Load environment variables from .env file
require("dotenv").config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Create a middleware to inject environment variables into the HTML
app.use((req, res, next) => {
  if (req.path === "/") {
    fs.readFile(path.join(__dirname, "index.html"), "utf8", (err, data) => {
      if (err) {
        return next(err);
      }

      // Format and inject the API_BASE_URL correctly
      const apiBaseUrl = `http://${process.env.API_BASE_URL}:${process.env.PORT}/api`;
      const html = data.replace(
        `window.API_BASE_URL = "http://<%= process.env.API_BASE_URL %>:${process.env.PORT}/api"`,
        `window.API_BASE_URL = "${apiBaseUrl}"`
      );

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    });
  } else {
    next();
  }
});

// Serve static files from the public directory
app.use("/public", express.static(path.join(__dirname, "public")));
// Serve root files like index.html (for all routes except root '/')
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
