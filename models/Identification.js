const mongoose = require('mongoose');
const { Schema } = mongoose;

const identificationSchema = new Schema({
  userID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  governmentIDPhoto: { type: String, required: true }, // Path to the stored image
  selfiePhoto: { type: String, required: true } // Path to the stored image
});

const Identification = mongoose.model('Identification', identificationSchema);

module.exports = Identification;