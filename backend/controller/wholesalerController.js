// =======================
// Module Imports
// =======================
const Joi = require('joi');
const pool = require('../config/db');
const asyncHandler = require('../serivces/asyncHandler');
const { wholesalerSchema, updateWholesalerSchema } = require('../serivces/schemaValidation');


// =======================
// 3. Get All Wholesalers (Vendors)
// =======================
const handleGetwholesalersData = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM wholesalers');

  if (!rows || rows.length === 0) {
    res.status(404);
    throw new Error('No vendor data found');
  }

  res.status(200).json({ no_vendors: rows.length, rows });
});


// =======================
// 6. Add New Wholesaler
// =======================
const addWholesaler = asyncHandler(async (req, res) => {
  const { error, value } = wholesalerSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }

  const { name, gst_no, address, contact, email } = value;

  try {
    const result = await pool.query(
      `INSERT INTO wholesalers (name, gst_no, address, contact, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, gst_no, address, contact, email]
    );

    res.status(201).json({
      success: true,
      message: 'Wholesaler added successfully',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      res.status(409);
      throw new Error('GST number already exists');
    }
    throw err;
  }
});


//========================
// update wholesaler info 
//=========================
const updateWholesalerData =   asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate incoming fields
  const { error, value } = updateWholesalerSchema.validate(req.body);
  if (error) {
    res.status(400);
    throw new Error(error.details[0].message);
  }


  // Build dynamic SET clause for SQL query
  const fields = Object.keys(value);
  const updates = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
  const values = Object.values(value);

  try {
    const result = await pool.query(
      `UPDATE wholesalers
       SET ${updates}
       WHERE wholesaler_id = $${fields.length + 1}
       RETURNING *`,
      [...values, id]
    );

    if (result.rowCount === 0) {
      res.status(404);
      throw new Error('Wholesaler not found');
    }

    res.status(200).json({
      success: true,
      message: 'Wholesaler updated successfully',
      data: result.rows[0]
    });

  } catch (err) {
    if (err.code === '23505') {
      res.status(409);
      throw new Error('GST number already exists');
    }
    throw err;
  }
});



//=====================================
// 7. delete wholesaler
//=======================================
const deleteWholesaler = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM wholesalers WHERE wholesaler_id = $1 RETURNING *',
    [id]
  );

  if (result.rowCount === 0) {
    res.status(404);
    throw new Error('Wholesaler not found');
  }

  res.status(200).json({
    success: true,
    message: 'Wholesaler deleted successfully',
    data: result.rows[0]
  });
});


//========================
// Module Exports   
//=========================
module.exports = {
    handleGetwholesalersData,
    addWholesaler,
    updateWholesalerData,
    deleteWholesaler
    };