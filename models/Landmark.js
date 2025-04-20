const mongoose = require("mongoose");

const LandmarkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"],
    trim: true,
  },
  location: {
    latitude: {
      type: String,
      required: [true, "Please add latitude"],
    },
    longitude: {
      type: String,
      required: [true, "Please add longitude"],
    },
  },
  description: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    enum: ["historical", "natural", "cultural", "other"],
    default: "other",
  },
  notes: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Landmark", LandmarkSchema);
