const express = require("express");
const router = express.Router();
const Landmark = require("../models/Landmark");
const { protect } = require("../middleware/authMiddleware");

// Apply protection middleware to all routes
router.use(protect);

// @route   GET /api/landmarks
// @desc    Get all landmarks for the logged-in user
// @access  Private
router.get("/", async (req, res) => {
  try {
    // Only return landmarks that belong to the logged-in user
    const landmarks = await Landmark.find({ user: req.user._id });
    res.json(landmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/landmarks/:id
// @desc    Get single landmark by ID
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    const landmark = await Landmark.findById(req.params.id);

    if (!landmark) {
      return res.status(404).json({ message: "Landmark not found" });
    }

    // Check if the landmark belongs to the logged-in user
    if (landmark.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to access this landmark" });
    }

    res.json(landmark);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/landmarks
// @desc    Create a new landmark
// @access  Private
router.post("/", async (req, res) => {
  try {
    const { name, latitude, longitude, description, category, notes } =
      req.body;

    // Create new landmark with the user ID
    const landmark = new Landmark({
      name,
      location: {
        latitude,
        longitude,
      },
      description,
      category,
      notes,
      user: req.user._id, // Associate the landmark with the logged-in user
    });

    await landmark.save();
    res.status(201).json(landmark);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/landmarks/:id
// @desc    Update a landmark
// @access  Private
router.put("/:id", async (req, res) => {
  try {
    const { name, latitude, longitude, description, category, notes } =
      req.body;

    // Build landmark object
    const landmarkFields = {};
    if (name) landmarkFields.name = name;
    if (description) landmarkFields.description = description;
    if (category) landmarkFields.category = category;
    if (notes) landmarkFields.notes = notes;

    if (latitude || longitude) {
      landmarkFields.location = {};
      if (latitude) landmarkFields.location.latitude = latitude;
      if (longitude) landmarkFields.location.longitude = longitude;
    }

    let landmark = await Landmark.findById(req.params.id);

    if (!landmark) {
      return res.status(404).json({ message: "Landmark not found" });
    }

    // Check if the landmark belongs to the logged-in user
    if (landmark.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to update this landmark" });
    }

    // Update
    landmark = await Landmark.findByIdAndUpdate(
      req.params.id,
      { $set: landmarkFields },
      { new: true }
    );

    res.json(landmark);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/landmarks/:id
// @desc    Delete a landmark
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const landmark = await Landmark.findById(req.params.id);

    if (!landmark) {
      return res.status(404).json({ message: "Landmark not found" });
    }

    // Check if the landmark belongs to the logged-in user
    if (landmark.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this landmark" });
    }

    await Landmark.deleteOne({ _id: req.params.id });

    res.json({ message: "Landmark removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
