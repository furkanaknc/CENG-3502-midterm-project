const express = require("express");
const router = express.Router();
const Landmark = require("../models/Landmark");

// @route   GET /api/landmarks
// @desc    Get all landmarks
// @access  Public
router.get("/", async (req, res) => {
  try {
    const landmarks = await Landmark.find();
    res.json(landmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/landmarks/:id
// @desc    Get single landmark by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const landmark = await Landmark.findById(req.params.id);

    if (!landmark) {
      return res.status(404).json({ message: "Landmark not found" });
    }

    res.json(landmark);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/landmarks
// @desc    Create a new landmark
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { name, latitude, longitude, description, category, notes } =
      req.body;

    // Create new landmark
    const landmark = new Landmark({
      name,
      location: {
        latitude,
        longitude,
      },
      description,
      category,
      notes,
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
// @access  Public
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
// @access  Public
router.delete("/:id", async (req, res) => {
  try {
    const landmark = await Landmark.findById(req.params.id);

    if (!landmark) {
      return res.status(404).json({ message: "Landmark not found" });
    }

    await Landmark.deleteOne({ _id: req.params.id });

    res.json({ message: "Landmark removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
