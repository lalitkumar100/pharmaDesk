const pool = require('../config/db'); // Assuming you have a db.js file for database connection
const fs = require('fs');
const path = require('path');

function createSchemaAndData() {


// Full path to the text file
const filePath = path.join(__dirname, '../doc/postgres_schema.txt');

// Read file (synchronously)
try {
  const data = fs.readFileSync(filePath, 'utf8');
   return data;
} catch (err) {
  console.error("❌ Error reading file:", err.message);
}

};

function deleteSchemaAndData() {


// Full path to the text file
const filePath = path.join(__dirname, '../doc/deleteSchema.txt');

// Read file (synchronously)
try {
  const data = fs.readFileSync(filePath, 'utf8');
   return data;
} catch (err) {
  console.error("❌ Error reading file:", err.message);
}

};


async function run() {
  const arg = process.argv[2];

  if (!arg || (arg !== '--create' && arg !== '--delete')) {
    console.log("Usage: node pharma-schema.js --create | --delete");
    process.exit(1);
  }

  try {
    if (arg === '--create') {
        const Data = createSchemaAndData();

      await pool.query(Data);
      console.log("✅ Schema created successfully.");
    } else if (arg === '--delete') {
    const deleteSchema = deleteSchemaAndData();
      await pool.query(deleteSchema);
      console.log("🗑️ Schema deleted successfully.");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();