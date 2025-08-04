const pool = require('../config/db');
const asyncHandler = require('../services/asyncHandler');
const {    getWholesalerIdByName, getOrCreateInvoice, updateInvoiceTotal,delete1  } = require('../services/medicie_serivce');
const { addExpiryStock } = require('../services/expiry_Service');

const handleExpiringMedicines = asyncHandler(async (req, res) => {


   const days = parseInt(req.query.days);
  const months = parseInt(req.query.months);
  const years = parseInt(req.query.years);
  let interval = '';

  if (!isNaN(days) && days > 0) {
    interval = `${days} DAY`;
  } else if (!isNaN(months) && months > 0) {
    interval = `${months} MONTH`;
  } else if (!isNaN(years) && years > 0) {
    interval = `${years} YEAR`;
  } else {
    return res.status(400).json({
      error: 'Please provide a valid query parameter: "days", "months", or "years".',
    });
  }


    const result = await pool.query(
      ` SELECT count(*) OVER() AS total_count,
        medicine_id,
        medicine_name,
        brand_name,
        batch_no,
        expiry_date,
        stock_quantity,
        mrp
      FROM 
        medicine_stock
      WHERE 
        expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${interval}')
      ORDER BY 
        expiry_date ASC;
      `
    );


    const rows = result.rows;    
if (!rows || rows.length === 0) {
  return res.status(404).json({ message: 'No expiring medicines found' });
}
    res.json({expriy_no:rows.length,rows});

});

//=======================
//remoce exprie medicine
//========================
const removeExpiringMedicines = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Medicine ID is required' });
  }

  const addExpiryStock = await addExpiryStock(id);
  if (!addExpiryStock.success) {  
     res.status(500)
     throw new Error('Failed to add medicine to expiry stock');
  }
  const deleteResult = await delete1(id);
  if (!deleteResult) {  
    res.status(500)
    throw new Error('Failed to delete medicine from stock');
  }

  res.json({
    message: 'Medicine as exprire successfully',
    data: result.rows[0],
  });
});


module.exports = {
  handleExpiringMedicines,
  removeExpiringMedicines
};


// =======================
