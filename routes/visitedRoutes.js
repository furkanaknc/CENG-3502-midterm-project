const express = require("express");
const router = express.Router();
const VisitedLandmark = require("../models/VisitedLandmark");
const Landmark = require("../models/Landmark");

// @route   GET /api/visited
// @desc    Get all visited landmarks
// @access  Public
router.get("/", async (req, res) => {
  try {
    const visitedLandmarks = await VisitedLandmark.find().populate("landmark");
    res.json(visitedLandmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/visited/:id
// @desc    Get visit history for specific landmark
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const visitedLandmarks = await VisitedLandmark.find({
      landmark: req.params.id,
    }).populate("landmark");

    if (visitedLandmarks.length === 0) {
      return res
        .status(404)
        .json({ message: "No visit records found for this landmark" });
    }

    res.json(visitedLandmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/visited
// @desc    Record a visited landmark
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { landmarkId, visitor_name, additional_notes } = req.body;

    // Check if landmark exists
    const landmark = await Landmark.findById(landmarkId);
    if (!landmark) {
      return res.status(404).json({ message: "Landmark not found" });
    }

    // Create new visited landmark record
    const visitedLandmark = new VisitedLandmark({
      landmark: landmarkId,
      visitor_name,
      additional_notes,
      visited_date: new Date(),
    });

    await visitedLandmark.save();

    // Populate the landmark details
    const populatedVisit = await VisitedLandmark.findById(
      visitedLandmark._id
    ).populate("landmark");

    res.status(201).json(populatedVisit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/visited/:id
// @desc    Update a visit record
// @access  Public
router.put("/:id", async (req, res) => {
  try {
    const { visitor_name, additional_notes, visited_date } = req.body;

    // Build visit record object
    const visitFields = {};
    if (visitor_name) visitFields.visitor_name = visitor_name;
    if (additional_notes) visitFields.additional_notes = additional_notes;
    if (visited_date) visitFields.visited_date = visited_date;

    let visitRecord = await VisitedLandmark.findById(req.params.id);

    if (!visitRecord) {
      return res.status(404).json({ message: "Visit record not found" });
    }

    // Update
    visitRecord = await VisitedLandmark.findByIdAndUpdate(
      req.params.id,
      { $set: visitFields },
      { new: true }
    ).populate("landmark");

    res.json(visitRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/visited/:id
// @desc    Delete a visit record
// @access  Public
router.delete("/:id", async (req, res) => {
  try {
    const visitRecord = await VisitedLandmark.findById(req.params.id);

    if (!visitRecord) {
      return res.status(404).json({ message: "Visit record not found" });
    }

    await visitRecord.remove();

    res.json({ message: "Visit record removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
