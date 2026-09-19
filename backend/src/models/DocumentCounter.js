const mongoose = require("mongoose");

const documentCounterSchema = new mongoose.Schema(
  {
    prefix: { type: String, required: true, trim: true, uppercase: true },
    year: { type: Number, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

documentCounterSchema.index({ prefix: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("DocumentCounter", documentCounterSchema);
