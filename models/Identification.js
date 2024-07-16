const mongoose = require("mongoose");
const { Schema } = mongoose;

const identificationSchema = new Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  governmentIDFrontPhoto: { type: String, required: false },
  governmentIDBackPhoto: { type: String, required: false },
  governmentIDFrontCompleteExtractedText: { type: String, required: false },
  governmentIDBackCompleteExtractedText: { type: String, required: false },
  selfiePhoto: { type: String, required: false },
  name: { type: String, required: false },
  surname: { type: String, required: false },
  idNumber: { type: String, required: false },
  nationality: { type: String, required: false },
  dateOfBirth: { type: Date, required: false }
});

const Identification = mongoose.model("Identification", identificationSchema);

module.exports = Identification;
