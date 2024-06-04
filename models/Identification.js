const mongoose = require("mongoose");
const { Schema } = mongoose;
const crypto = require("crypto-js");

const identificationSchema = new Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  governmentIDFrontPhoto: { type: String, required: false },
  governmentIDBackPhoto: { type: String, required: false },
  governmentIDFrontCompleteExtractedText: { type: String, required: false },
  governmentIDBackCompleteExtractedText: { type: String, required: false },
  selfiePhoto: { type: String, required: false },
  name: { type: String, required: true },
  idNumber: { type: String, required: true },
  nationality: { type: String, required: true },
});

identificationSchema.pre("save", function (next) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  this.name = crypto.AES.encrypt(this.name, encryptionKey).toString();
  this.idNumber = crypto.AES.encrypt(this.idNumber, encryptionKey).toString();
  this.nationality = crypto.AES.encrypt(
    this.nationality,
    encryptionKey
  ).toString();
  this.governmentIDFrontCompleteExtractedText = crypto.AES.encrypt(
    this.governmentIDFrontCompleteExtractedText,
    encryptionKey
  ).toString();
  this.governmentIDBackCompleteExtractedText = crypto.AES.encrypt(
    this.governmentIDBackCompleteExtractedText,
    encryptionKey
  ).toString();

  next();
});

const Identification = mongoose.model("Identification", identificationSchema);

module.exports = Identification;
