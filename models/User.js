const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { isEmail } = require("validator");
const getNextSequenceValue = require("../utils/getNextSequenceValue");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: false },
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  passwordHash: { type: String, required: true },
  accountNumber: { type: Number, required: true, unique: true },
  dateOfBirth: { type: Date, required: false },
  gender: {
    type: String,
    required: false,
    enum: ["Male", "Female", "Non-binary", "Prefer not to say"],
  },
  isVerified: { type: Boolean, default: false },
  isPremiumUser: { type: Boolean, default: false },
  accountStatus: {
    type: String,
    required: true,
    enum: ["ACTIVE", "PENDING", "DELETED", "CANCELLED"],
  },
});

userSchema.pre("save", async function (next) {
  if (this.isNew) {
    this.accountNumber = await getNextSequenceValue("User");
  }

  if (this.isModified("passwordHash")) {
    const hash = await bcrypt.hash(this.passwordHash, 10);
    this.passwordHash = hash;
  }

  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
