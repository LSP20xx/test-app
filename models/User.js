const mongoose = require("mongoose");
const { isEmail } = require("validator");
const getNextSequenceValue = require("../utils/getNextSequenceValue");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: {
    type: String,
    required: false,
    validate: [isEmail, "Please enter a valid email"],
  },
  passwordHash: { type: String, required: false },
  accountNumber: { type: Number, required: true, unique: true },
  gender: {
    type: String,
    required: false,
    enum: ["Male", "Female", "Non-binary", "Prefer not to say"],
  },
  isVerified: { type: Boolean, default: false },
  isPremiumUser: { type: Boolean, default: false },
  accountStatus: {
    type: String,
    required: false,
    enum: ["ACTIVE", "PENDING", "DELETED", "CANCELLED"],
  },
  role: {
    type: String,
    required: true,
    enum: ["USER", "INSTITUTION", "ADMIN"],
    default: "USER",
  },
  termsAndConditionsAccepted: { type: Boolean, default: false }
}, {
  timestamps: true // Habilita createdAt y updatedAt
});

userSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.accountNumber = await getNextSequenceValue("User");
  }

  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
