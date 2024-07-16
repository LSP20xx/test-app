const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InformationResourceSchema = new Schema({
  resourceID: {
    type: String,
    required: true,
    unique: true
  },
  contentType: {
    type: String,
    enum: ['article', 'video', 'other'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  relatedConditions: {
    type: [String],
    required: false
  }
});

const InformationResource = mongoose.model('InformationResource', InformationResourceSchema);
module.exports = InformationResource;
