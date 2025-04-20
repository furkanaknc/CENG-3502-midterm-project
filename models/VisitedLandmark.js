const mongoose = require("mongoose");

const VisitedLandmarkSchema = new mongoose.Schema({
  landmark: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Landmark",
    required: true,
  },
  visited_date: {
    type: Date,
    default: Date.now,
  },
  visitor_name: {
    type: String,
    default: "Anonymous",
  },
  additional_notes: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("VisitedLandmark", VisitedLandmarkSchema);
