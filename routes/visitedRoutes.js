const express = require("express");
const router = express.Router();
const VisitedLandmark = require("../models/VisitedLandmark");
const Landmark = require("../models/Landmark");
const { protect } = require("../middleware/authMiddleware");

// Apply protection middleware to all routes
router.use(protect);

// @route   GET /api/visited
// @desc    Get all visited landmarks for the logged-in user
// @access  Private
router.get("/", async (req, res) => {
  try {
    // Only fetch visited landmarks that belong to the current user
    const visitedLandmarks = await VisitedLandmark.find({
      user: req.user._id,
    }).populate("landmark");
    res.json(visitedLandmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/visited/:id
// @desc    Get visit history for specific landmark for the logged-in user
// @access  Private
router.get("/:id", async (req, res) => {
  try {
    // Only fetch visited landmarks that belong to the current user
    const visitedLandmarks = await VisitedLandmark.find({
      landmark: req.params.id,
      user: req.user._id,
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
// @access  Private
router.post("/", async (req, res) => {
  try {
    const { landmarkId, visitor_name, additional_notes } = req.body;

    // Check if landmark exists
    const landmark = await Landmark.findById(landmarkId);
    if (!landmark) {
      return res.status(404).json({ message: "Landmark not found" });
    }

    // Check if the landmark belongs to the current user
    if (landmark.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to mark this landmark as visited" });
    }

    // Create new visited landmark record with user ID
    const visitedLandmark = new VisitedLandmark({
      landmark: landmarkId,
      visitor_name,
      additional_notes,
      visited_date: new Date(),
      user: req.user._id, // Associate with the logged-in user
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
// @access  Private
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

    // Check if the visit record belongs to the current user
    if (visitRecord.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to update this visit record" });
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
// @access  Private
router.delete("/:id", async (req, res) => {
  try {
    const visitRecord = await VisitedLandmark.findById(req.params.id);

    if (!visitRecord) {
      return res.status(404).json({ message: "Visit record not found" });
    }

    // Check if the visit record belongs to the current user
    if (visitRecord.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this visit record" });
    }

    await VisitedLandmark.deleteOne({ _id: req.params.id });

    res.json({ message: "Visit record removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
