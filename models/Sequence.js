const mongoose = require("mongoose");

const sequenceSchema = new mongoose.Schema({
  modelName: { type: String, required: true, unique: true },
  sequenceValue: { type: Number, required: true, default: 0 },
});

const Sequence = mongoose.model("Sequence", sequenceSchema);

module.exports = Sequence;
