const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // assuming you have a User model
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  speechQuality: {
    type: Number, // value from 0-100 or scale you decide
    required: true
  }
});

// Ensure one entry per user per day
progressSchema.index({ userId: 1, date: 1 }, { unique: true });

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;
