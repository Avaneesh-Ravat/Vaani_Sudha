const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");

const app = express();
app.use(cors());

async function getStory() {
    try {
        const response = await axios.get("https://shortstories-api.onrender.com/");
        return response.data.story;
    } catch (error) {
        console.error("Error fetching story:", error);
        return "Default short story text...";
    }
}

// Render the homepage with a short story
app.get("/speech-analysis", async (req, res) => {
    const story = await getStory();
    res.render("speech_analysis.ejs", { story, result: null });
});


// Setup Multer for file uploads
const upload = multer({ dest: "uploads/" });

app.post("/analyze", upload.single("audio"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const formData = new FormData();
    formData.append("audio", fs.createReadStream(req.file.path)); // Send the file

    try {
        const response = await fetch("http://127.0.0.1:5001/detect-stutter", {
            method: "POST",
            body: formData,
            headers: formData.getHeaders(), // Important!
        });

        const result = await response.json();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Error processing request" });
    }
});

app.listen(3000, () => {
    console.log("Express server running on port 3000");
});
