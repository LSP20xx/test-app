const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    validate: [isEmail, 'Please enter a valid email']
  },
  passwordHash: { type: String, required: true },
  accountNumber: { type: String, required: true, unique: true },
  dateOfBirth: { type: Date, required: true },
  gender: { 
    type: String, 
    required: true, 
    enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] 
  },
  isVerified: { type: Boolean, default: false },
  isPremiumUser: { type: Boolean, default: false },
  accountStatus: { 
    type: String, 
    required: true, 
    enum: ['ACTIVE', 'DELETED', 'CANCELLED'] 
  }
});

userSchema.pre('save', function(next) {
  const user = this;
  if (!user.isModified('passwordHash')) return next();
  bcrypt.hash(user.passwordHash, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return next(err);
    }
    user.passwordHash = hash;
    next();
  });
});

const User = mongoose.model('User', userSchema);

module.exports = User;