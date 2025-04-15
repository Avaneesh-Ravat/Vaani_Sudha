const mongoose = require('mongoose');

const therapySchema = new mongoose.Schema({
  therapyName: {
    type: String,
    required: true,
    unique: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  steps: {
    type: [String],
    required: true,
    validate: [arrayLimit, '{PATH} must have at least one step']
  }
});

function arrayLimit(val) {
  return val.length > 0;
}

const Therapy = mongoose.model('Therapy', therapySchema);

module.exports = Therapy;
