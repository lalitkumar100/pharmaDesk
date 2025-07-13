// Step 1: Import express
const express = require('express');
const db = require('./config/db');
const adminRouter = require('./routes/admin/purchase');
// Step 2: Create an app instance
const app = express();
const errorHandler = require('./middlewares/errorHandler');

// Step 3: Define a port (you can choose any)
const PORT = 3000;

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware to parse URL-encoded bodies
// Use the admin router for routes starting with /admin
app.use('/admin', adminRouter);
app.use(errorHandler); // Error handling middleware


// Step 4: Define a simple route
// const exportExcelRoute = require('./routes/exportExcel');
// app.use('/', exportExcelRoute);



// Step 5: Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

