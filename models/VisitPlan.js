const mongoose = require("mongoose");

const VisitPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: "My Visit Plan",
  },
  description: {
    type: String,
    default: "",
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
  planned_date: {
    type: Date, 
    default: null,
  },
  landmarks: [
    {
      landmark: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Landmark",
        required: true,
      },
      notes: {
        type: String,
        default: "",
      },
      visit_order: {
        type: Number,
        default: 0,
      },
    },
  ],
  category: {
    type: String,
    enum: ["historical", "natural", "cultural", "other"],
    default: "other",
  },
});

module.exports = mongoose.model("VisitPlan", VisitPlanSchema);
