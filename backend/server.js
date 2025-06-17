// server.js

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const morgan = require('morgan');




dotenv.config();



const app = express();

// Add before your routes
app.use(morgan('dev')); // 'dev' is a predefined format

const port = process.env.PORT || 5000;
const genAI = new GoogleGenerativeAI('AIzaSyAiHjvkPwRhaFsXjQIdu31QQAvdwYuLKA4');

// Multer setup for photo upload
const upload = multer({ dest: 'uploads/' });

app.post('/ask-photo', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      { text: "Describe the image in detail." },
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: imageBuffer.toString('base64'),
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    console.log('Response:', text);
    // Delete uploaded image after processing
    fs.unlinkSync(imagePath);

    res.json({ reply: text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

app.get('/', (req, res) => {
  res.send('🚀 Gemini Vision API Server is Running');
});

app.listen(port, () => {
  console.log(`🌐 Server is running at http://localhost:${port}`);
});
