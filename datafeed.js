const mongoose = require('mongoose');
const Progress = require('./models/progress.js');

async function insertProgressData() {
  await mongoose.connect('mongodb://127.0.0.1:27017/your_db_name'); // change DB name

  const userId = '67c949c0df402b5940e40665'; // change the id accordingly


  const progressEntries = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    progressEntries.push({
      userId,
      date,
      speechQuality: Math.floor(Math.random() * 51) + 50 // 50-100
    });
  }

  try {
    await Progress.insertMany(progressEntries, { ordered: false });
    console.log('Inserted progress data for 30 days!');
  } catch (err) {
    console.error('Error inserting:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

insertProgressData();
