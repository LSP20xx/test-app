const mongoose = require('mongoose');
const { Schema } = mongoose;

const testSchema = new Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testPhoto: { type: String, required: true }, // Path to the stored image
  testResult: { 
    type: String, 
    required: true, 
    enum: ['SCD', 'trait', 'negative'] 
  },
  resultSent: { type: Boolean, default: false }
});

const Test = mongoose.model('Test', testSchema);

module.exports = Test;