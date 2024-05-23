const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const biometricDataSchema = new Schema({
  userID: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  faceScanData: { type: Buffer, required: true },
  fingerprintData: { type: Buffer, required: true }
});

const BiometricData = mongoose.model('BiometricData', biometricDataSchema);

module.exports = BiometricData;