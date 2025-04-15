const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads folder exists
const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'recording.webm');
  }
});
const upload = multer({ storage: storage });

// Route to receive audio and forward to Flask
app.post('/send-audio', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    console.error('❌ No file received');
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  console.log('✅ Audio saved:', req.file.path);

  try {
    const originalPath = req.file.path;
    const wavPath = path.join(path.dirname(originalPath), path.basename(originalPath, path.extname(originalPath)) + '.wav');

    // Convert webm to wav
    await convertToWav(originalPath, wavPath);

    // Prepare FormData for Flask
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(wavPath));
    console.log(formData);

    // Send POST to Flask API
    const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
      headers: formData.getHeaders()
    });

    // Send back prediction to frontend
    return res.json(response.data);

  } catch (err) {
    console.error('❌ Error calling Flask API:', err.message);
    return res.status(500).json({ error: 'Failed to get prediction from Python API.' });
  }
});




function convertToWav(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .on('end', () => {
        console.log('✅ Conversion finished:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ Conversion error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Node server running at http://localhost:${PORT}`);
});
