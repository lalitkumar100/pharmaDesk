const pool = require('../config/db');
const asyncHandler = require('../serivces/asyncHandler');
const {buildInvoiceSearchQuery} =require('../serivces/InvoiceSearchQuery');

// ============================
// Helper: Check if wholesaler exists
// ============================
const checkWholesalerExists = async (wholesaler_id) => {
  const result = await pool.query(
    'SELECT wholesaler_id FROM wholesalers WHERE wholesaler_id = $1',
    [wholesaler_id]
  );
  return result.rowCount > 0;
};

// ============================
// Helper: Check if invoice exists
// ============================
const checkInvoiceExists = async (invoice_id) => {
  const result = await pool.query(
    'SELECT * FROM invoices WHERE invoice_id = $1',
    [invoice_id]
  );
  return result.rowCount > 0;
};

// ============================
// 1. Get All Invoices
// ============================
const handleGetInvoicesData = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM invoices ORDER BY invoice_id');

  if (!rows.length) {
    res.status(404);
    throw new Error('No invoice data found');
  }

  res.status(200).json({ no_of_invoices: rows.length, invoices: rows });
});

// ============================
// 2. Add New Invoice
// ============================
const addNewInvoice = asyncHandler(async (req, res) => {
  const {
    invoice_no,
    invoice_date,
    total_amount,
    payment_status = 'Unpaid',
    payment_date,
    wholesaler_id
  } = req.body;

  // Check wholesaler existence
  const wholesalerExists = await checkWholesalerExists(wholesaler_id);
  if (!wholesalerExists) {
    res.status(400);
    throw new Error('Wholesaler not found');
  }

  // Insert new invoice
  const insertQuery = `
    INSERT INTO invoices (
      invoice_no, invoice_date, total_amount,
      payment_status, payment_date, wholesaler_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    invoice_no,
    invoice_date || new Date(),
    total_amount,
    payment_status,
    payment_date || null,
    wholesaler_id
  ];

  const { rows } = await pool.query(insertQuery, values);

  res.status(201).json({
    message: 'Invoice created successfully',
    invoice: rows[0]
  });
});

// ============================
// 3. Update Invoice
// ============================
const updateInvoice = asyncHandler(async (req, res) => {
  const { invoice_id } = req.params;
  const {
    invoice_no,
    invoice_date,
    total_amount,
    payment_status,
    payment_date,
    wholesaler_id
  } = req.body;

  // Check invoice
  const invoiceExists = await checkInvoiceExists(invoice_id);
  if (!invoiceExists) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  // Check wholesaler
  const wholesalerExists = await checkWholesalerExists(wholesaler_id);
  if (!wholesalerExists) {
    res.status(400);
    throw new Error('Wholesaler not found');
  }

  const updateQuery = `
    UPDATE invoices
    SET
      invoice_no = $1,
      invoice_date = $2,
      total_amount = $3,
      payment_status = $4,
      payment_date = $5,
      wholesaler_id = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE invoice_id = $7
    RETURNING *
  `;

  const values = [
    invoice_no,
    invoice_date || new Date(),
    total_amount,
    payment_status,
    payment_date || null,
    wholesaler_id,
    invoice_id
  ];

  const { rows } = await pool.query(updateQuery, values);

  res.status(200).json({
    message: 'Invoice updated successfully',
    invoice: rows[0]
  });
});

// ============================
// 4. Delete Invoice
// ============================
const deleteInvoice = asyncHandler(async (req, res) => {
  const { invoice_id } = req.params;

  const invoiceExists = await checkInvoiceExists(invoice_id);
  if (!invoiceExists) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  await pool.query('DELETE FROM invoices WHERE invoice_id = $1', [invoice_id]);

  res.status(200).json({
    message: 'Invoice deleted successfully'
  });
});

//===============================================================
//serach invoices
//===============================================================
const InvoiceSerach = asyncHandler(async(req,res)=>{
    
        const {text ,values } = buildInvoiceSearchQuery(req.query);
        let result;
       try {
       result = await  pool.query(text,values);
        
       } catch (error) {
        throw new Error(error);
      }
      if(result.rows.length == 0){
        res.status(200).json({message:"no invoices is found"})
       }
       res.status(200).json({
         count: result.rows.length,
    data: result.rows,
       })
       
   
});

module.exports = {
  handleGetInvoicesData,
  addNewInvoice,
  updateInvoice,
  deleteInvoice,
  InvoiceSerach
};
