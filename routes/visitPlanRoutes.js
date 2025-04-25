const express = require("express");
const router = express.Router();
const VisitPlan = require("../models/VisitPlan");
const Landmark = require("../models/Landmark");
const { protect } = require("../middleware/authMiddleware");

// Apply protection middleware to all routes
router.use(protect);

router.get("/", async (req, res) => {
  try {
    // Only fetch visit plans that belong to the current user
    const visitPlans = await VisitPlan.find({
      user: req.user._id,
    }).populate("landmarks.landmark");
    res.json(visitPlans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const visitPlan = await VisitPlan.findById(req.params.id).populate(
      "landmarks.landmark"
    );

    // Check if visit plan exists
    if (!visitPlan) {
      return res.status(404).json({ message: "Visit plan not found" });
    }

    // Check if the visit plan belongs to the current user
    if (visitPlan.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to access this visit plan" });
    }

    res.json(visitPlan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description, landmarks, planned_date } = req.body;

    // Validate landmarks
    if (!landmarks || landmarks.length === 0) {
      return res.status(400).json({
        message: "At least one landmark is required for a visit plan",
      });
    }

    // Check if all landmarks exist
    for (const item of landmarks) {
      const landmark = await Landmark.findById(item.landmark);
      if (!landmark) {
        return res
          .status(404)
          .json({ message: `Landmark with ID ${item.landmark} not found` });
      }
      // Check if the landmark belongs to the current user
      if (landmark.user.toString() !== req.user._id.toString()) {
        return res.status(401).json({
          message: `Not authorized to add landmark ${item.landmark} to visit plan`,
        });
      }
    }

    // Create new visit plan - category is omitted (model default will be used)
    const visitPlan = new VisitPlan({
      name: name || "My Visit Plan",
      description: description || "",
      user: req.user._id,
      landmarks,
      planned_date: planned_date || null,
    });

    await visitPlan.save();

    // Populate the landmark details
    const populatedPlan = await VisitPlan.findById(visitPlan._id).populate(
      "landmarks.landmark"
    );

    res.status(201).json(populatedPlan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const visitPlan = await VisitPlan.findById(req.params.id);

    if (!visitPlan) {
      return res.status(404).json({ message: "Visit plan not found" });
    }

    // Check if the visit plan belongs to the current user
    if (visitPlan.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this visit plan" });
    }

    await VisitPlan.deleteOne({ _id: req.params.id });

    res.json({ message: "Visit plan removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
