const mongoose = require('mongoose');
const { Schema } = mongoose;

const parentalConsentSchema = new Schema({
  childID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentUserID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  consentGiven: { type: Boolean, required: true },
  consentDocument: { type: String, required: true } // Path to the stored consent document
});

const ParentalConsent = mongoose.model('ParentalConsent', parentalConsentSchema);

module.exports = ParentalConsent;