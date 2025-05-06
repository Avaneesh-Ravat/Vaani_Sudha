const mongoose = require('mongoose');

const latestProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  speechQuality: {
    type: Number,
    required: true
  }
}, { timestamps: true }); // optional: adds createdAt/updatedAt

const LatestProgress = mongoose.model('LatestProgress', latestProgressSchema);

module.exports = LatestProgress;
