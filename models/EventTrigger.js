const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define RecommendedActions enum
const RecommendedActions = Object.freeze({
  NOTIFY_USER: 'NOTIFY_USER',
  REFER_TO_PROFESSIONAL: 'REFER_TO_PROFESSIONAL',
  SCHEDULE_COUNSELING: 'SCHEDULE_COUNSELING',
  SEND_INFORMATION_RESOURCES: 'SEND_INFORMATION_RESOURCES',
  REGISTER_FOR_TREATMENT: 'REGISTER_FOR_TREATMENT',
});

// Define EventTrigger schema
const eventTriggerSchema = new Schema({
  eventID: { type: String, required: true, unique: true },
  testResult: { type: String, required: true, enum: ['SCD', 'trait', 'negative'] },
  actions: [{ type: String, enum: Object.values(RecommendedActions), required: true }]
});

// Apply the enum as a static property on the schema
Object.assign(eventTriggerSchema.statics, {
  RecommendedActions,
});

const EventTrigger = mongoose.model('EventTrigger', eventTriggerSchema);

module.exports = EventTrigger;