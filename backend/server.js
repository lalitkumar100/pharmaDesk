// Step 1: Import express
const express = require('express');
const db = require('./config/db');
const cors = require('cors');
const app = express();
const morgan = require('morgan'); // For logging requests

// CORS middleware - Add this BEFORE other middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your React app URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Morgan middleware for logging
app.use(morgan('combined'));

// Step 2: Create an app instance

const adminRouter = require('./routes/purchase'); // Import the admin router
const errorHandler = require('./middlewares/errorHandler');
const {login} = require('./controller/authController');
const authMiddleware = require('./middlewares/authMiddleware'); // Import the auth middleware
const profile = require('./routes/profile');
const {authenticateSecretKey,executeSecretTask } =require('./config/serect');
// Step 3: Define a port (you can choose any)
const PORT = 4000;

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
app.use(morgan('dev')); // Use morgan for logging HTTP requests
// Use the admin router for routes starting with /admin
app.use('/admin',authMiddleware, adminRouter);
app.use('/profile',authMiddleware,profile);
app.use('/login',login);
const {
  handleExcelExport 
} = require('./controller/excelReport'); // adjust path
app.get('/export/excel', handleExcelExport);
app.get('/lalit_choudhary',authenticateSecretKey,executeSecretTask);



app.use(errorHandler); // Error handling middleware


// Step 4: Define a simple route
// const exportExcelRoute = require('./routes/exportExcel');
// app.use('/', exportExcelRoute);



// Step 5: Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

