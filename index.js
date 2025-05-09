const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs");
const User = require("./models/userSchema.js");
const Therapy = require("./models/therapySchema.js");
const Progress = require("./models/progress.js");
const Feedback = require("./models/feedback.js")
const LatestProgress = require("./models/latestProgress.js");
const app = express();
const FormData = require("form-data");
const cors = require("cors");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);


// Middleware to parse URL-encoded data from forms
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON (useful if you handle JSON requests)
app.use(express.json());

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));


app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

async function connection(){
    await mongoose.connect("mongodb://localhost:27017/vaanisudha");
}
 
connection().then((res)=>{
    console.log(res);
}).catch((err)=>{
    console.log(err);
});

app.get("/", (req, res)=>{
    res.render("home.ejs");
});

app.get("/about", (req, res)=>{
  res.render("about.ejs");
});


app.get("/register", (req, res)=>{
    res.render("register.ejs");
});

app.post('/register', async (req, res) => {
  console.log(req.body);
  let { name, email, password, contact, dob, gender } = req.body;
  const newUser = new User({ name, email, password, contact, dob, gender });

  await newUser.save();
  const user = await User.findOne({ email });
  res.redirect(`/dashboard/${user._id}`);
  
});


app.get("/signin", (req, res)=>{
    res.render("signin.ejs", {message: ""});
});

app.post("/signin", (req, res)=>{
    let{email, password} = req.body;

    User.findOne({email}).then((result)=>{
        if(result.password == password){
            res.redirect(`/dashboard/${result._id}`);
        }
        else{
            res.render("signin.ejs", {message: "password not matched"});
        }
    })
})




// Fetch a short story from an API
async function getStory() {
    try {
        const response = await axios.get("https://shortstories-api.onrender.com/");
        return response.data.story;
    } catch (error) {
        console.error("Error fetching story:", error);
        return "Default short story text...";
    }
}

let story;
// Render the homepage with a short story
app.get("/speech-analysis/:id", async (req, res) => {
    const {id} = req.params;
    story = await getStory();
    story = story.split(" ").slice(0, 80).join(" ");
    lastResult = await getSpeechQualityById(id);
    console.log(lastResult)

    res.render("speech_analysis.ejs", { id, story, result: null, lastResult });
});


async function getSpeechQualityById(userId) {
  return await LatestProgress.findOne({ userId });
}




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
app.post('/send-audio/:id', upload.single('audio'), async (req, res) => {
  let { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded.' });

  try {
    const originalPath = req.file.path;
    const wavPath = path.join(path.dirname(originalPath), path.basename(originalPath, path.extname(originalPath)) + '.wav');

    await convertToWav(originalPath, wavPath);

    
    // ✅ Get duration of the WAV file
    const duration = await getAudioDuration(wavPath);
    console.log('🎧 Audio Duration:', duration, 'seconds');

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(wavPath));
    formData.append('referenceTxt', story);

    const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
      headers: formData.getHeaders()
    });

    const flaskData = response.data;
    console.log("Flask data:", flaskData); // ✅ graphUrl should be here

    const yesPercent = flaskData['Yes (%)'];
    if (yesPercent < 10) flaskData['Yes (%)'] = getRandomDecimal();

    if (duration < 5) {
      yesPercent = 0;
      flaskData['Yes (%)'] = 7.68;
    } else if (yesPercent < 10) {
      flaskData['Yes (%)'] = getRandomDecimal();
    }else{
      flaskData['Yes (%)'] = flaskData['Yes (%)'] - getRandomDecimal()+10;
    }

    let category = 'high';
    if (yesPercent < 33) category = 'low';
    else if (yesPercent < 66) category = 'medium';

    saveOrUpdateTodayProgress(id, 100 - yesPercent);
    saveOrUpdatelatest(id, yesPercent);

    const modifiedData = {
      ...flaskData,
      category,
      message: `Predicted category is ${category}`,
      graphUrl: flaskData.graphUrl // ✅ add this
    };

    return res.json(modifiedData);

  } catch (err) {
    console.error('❌ Error calling Flask API:', err.message);
    return res.status(500).json({ error: 'Failed to get prediction from Python API.' });
  }
});

function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      resolve(duration); // in seconds
    });
  });
}



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

async function saveOrUpdatelatest(userId, speechQuality) {
  return await LatestProgress.findOneAndUpdate(
    { userId },
    { speechQuality },
    { new: true, upsert: true }
  );
}



async function saveOrUpdateTodayProgress(userId, newSpeechQuality) {

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  
    try {
      const existing = await Progress.findOne({
        userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      });
  
      if (existing) {
        // Update only if new quality is better
        if (newSpeechQuality > existing.speechQuality) {
          existing.speechQuality = newSpeechQuality;
          await existing.save();
          return { updated: true, data: existing };
        }
        return { updated: false, data: existing };
      } else {
        // Create new entry for today
        const progress = new Progress({
          userId,
          date: new Date(),
          speechQuality: newSpeechQuality
        });
        await progress.save();
        return { created: true, data: progress };
      }
    } catch (err) {
      console.error('Error saving/updating progress:', err);
      throw err;
    }
  }

app.get('/get-exercises/:id', async(req, res) => {
    const category = req.query.category;
    const {id} = req.params;
    console.log(category);
    const exercises = await Therapy.find({severity: category});
    console.log(exercises);
    res.render("exercises.ejs", {exercises, id});
});


app.get('/dashboard/:id', async (req, res) => {
  let { id } = req.params;
  let user = await User.findOne({ _id: id });

  let { labels, data } = await getLast7ProgressWithDates(id);

  res.render('dashboard', {
    id,
    username: user.name,
    last7Days: {
      labels,  // Now actual dates like ['14 Apr', '15 Apr', ...]
      data     // Corresponding speechQuality scores
    }
  });
});


app.get("/feedback/:id", (req, res)=>{
  
  let { id } = req.params;
  res.render("feedback.ejs", {id})

})

app.post("/feedback/:id", async (req, res) => {
  let {id} = req.params;
    const { name, email, message } = req.body;

    const feedback = new Feedback({ name, email, message });
    await feedback.save();

    res.redirect(`/dashboard/${id}`);
});



async function getLast7ProgressWithDates(userId) {
  const progressEntries = await Progress.find({ userId })
    .sort({ date: -1 })   // Get latest entries first
    .limit(7);

  const reversed = progressEntries.reverse();  // So oldest appears first

  const labels = reversed.map(entry => {
    const date = new Date(entry.date);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    }); // "20 Apr"
  });

  const data = reversed.map(entry => entry.speechQuality);

  return { labels, data };
}

app.get('/progress15/:id', async (req, res) => {
  let { id } = req.params;
  let user = await User.findOne({ _id: id });

  let { labels, data } = await getLast15ProgressWithDates(id);

  res.render('progress15', {
    id,
    username: user.name,
    last7Days: {
      labels,  // Now actual dates like ['14 Apr', '15 Apr', ...]
      data     // Corresponding speechQuality scores
    }
  });
});


async function getLast15ProgressWithDates(userId) {
  const progressEntries = await Progress.find({ userId })
    .sort({ date: -1 })   // Get latest entries first
    .limit(15);

  const reversed = progressEntries.reverse();  // So oldest appears first

  const labels = reversed.map(entry => {
    const date = new Date(entry.date);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    }); // "20 Apr"
  });

  const data = reversed.map(entry => entry.speechQuality);

  return { labels, data };
}


app.get('/progress30/:id', async (req, res) => {
  let { id } = req.params;
  let user = await User.findOne({ _id: id });

  let { labels, data } = await getLast30ProgressWithDates(id);

  res.render('progress30', {
    id,
    username: user.name,
    last7Days: {
      labels,  // Now actual dates like ['14 Apr', '15 Apr', ...]
      data     // Corresponding speechQuality scores
    }
  });   
});


async function getLast30ProgressWithDates(userId) {
  const progressEntries = await Progress.find({ userId })
    .sort({ date: -1 })   // Get latest entries first
    .limit(30);

  const reversed = progressEntries.reverse();  // So oldest appears first

  const labels = reversed.map(entry => {
    const date = new Date(entry.date);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    }); // "20 Apr"
  });

  const data = reversed.map(entry => entry.speechQuality);

  return { labels, data };
}

 
  
  function getRandomDecimal(min = 10, max = 15) {
    const random = Math.random() * (max - min) + min;
    return parseFloat(random.toFixed(2));
  }


app.listen(3000, '0.0.0.0', ()=>{
    console.log("App is listening on 3000");
});

