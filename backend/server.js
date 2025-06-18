// server.js
const cors = require('cors');


const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const morgan = require('morgan');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors()); // 💡 Allow all origins for dev
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // for parsing form-data text
app.use(cors({
  origin: 'http://localhost:3000', // your frontend port
  credentials: true,
}));


const genAI = new GoogleGenerativeAI('AIzaSyAiHjvkPwRhaFsXjQIdu31QQAvdwYuLKA4');

// Multer setup for optional image upload
const upload = multer({ dest: 'uploads/' });

app.post('/ask-photo', upload.single('image'), async (req, res) => {
  try {
    const userText = req.body.text || null;
    const hasImage = req.file ? true : false;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let parts = [];

    if (userText) {
      parts.push({ text: userText });
    }

    if (hasImage) {
      const imagePath = req.file.path;
      const imageBuffer = fs.readFileSync(imagePath);

      parts.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: imageBuffer.toString('base64'),
        },
      });
    }

    if (parts.length === 0) {
      return res.status(400).json({ error: 'No text or image provided' });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const replyText = response.text();

    if (hasImage) {
      fs.unlinkSync(req.file.path); // Clean up uploaded file
    }
    console.log('Response:', replyText);
    res.status(200).json({ reply: replyText });
  } catch (error) {
    console.error('Error:', error.message || error);
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

app.get('/', (req, res) => {
  res.send('🚀 Gemini Vision API Server is Running');
});

app.listen(port, () => {
  console.log(`🌐 Server is running at http://localhost:${port}`);
});
