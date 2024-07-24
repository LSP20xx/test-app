const mongoose = require('mongoose');
const { Schema } = mongoose;

const testSchema = new Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testPhoto1: { type: String, required: true },
  testPhoto2: { type: String, required: false },
  testResult: { 
    type: String, 
    required: false, 
    enum: ['No Blood Samples', 'HbAA', 'HbAS', 'HbSS', 'HbAC', 'HbSC'] 
  },
  resultSent: { type: Boolean, default: false },
  predictions: [
    {
      displayName: { type: String, required: true },
      confidence: { type: Number, required: true },
    }
  ]
}, { timestamps: true });

const Test = mongoose.model('Test', testSchema);

module.exports = Test;
