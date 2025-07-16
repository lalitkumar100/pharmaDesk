const pool = require('../config/db');
const asyncHandler = require('../serivces/asyncHandler');
const { buildMedicineSearchQuery } = require('../serivces/MedicineSearchQuery');

// Get wholesaler ID by name
const getWholesalerIdByName = async (name) => {
  const query = 'SELECT wholesaler_id FROM wholesalers WHERE name = $1';
  const result = await pool.query(query, [name]);
  return result.rowCount ? result.rows[0].wholesaler_id : null;
};

// Get or create invoice
const getOrCreateInvoice = async (invoiceNumber, wholesalerId) => {
  const queryInvoice = 'SELECT invoice_id FROM invoices WHERE invoice_no = $1 AND wholesaler_id = $2';
  const result = await pool.query(queryInvoice, [invoiceNumber, wholesalerId]);

  if (result.rowCount > 0) return result.rows[0].invoice_id;

  const insertQuery = `
    INSERT INTO invoices (invoice_no, wholesaler_id)
    VALUES ($1, $2)
    RETURNING invoice_id
  `;
  const insertResult = await pool.query(insertQuery, [invoiceNumber, wholesalerId]);
  if (insertResult.rowCount === 0) return null;

  return insertResult.rows[0].invoice_id;
};

const updateInvoiceTotal = async (invoiceId, totalAmount) => {
  try {
    const queryCheck = 'SELECT total_amount FROM invoices WHERE invoice_id = $1';
    const result = await pool.query(queryCheck, [invoiceId])?.rows[0] ;
    const newTotalAmount = result.rows[0].total_amount + totalAmount;
    const query = `UPDATE invoices
      SET total_amount = $1 ,
          updated_at = CURRENT_TIMESTAMP
      WHERE invoice_id = $3
    `;
    await pool.query(query, [newTotalAmount, invoiceId]); // ✅ Correct variable
  } catch (error) {
    res.status(500);
    throw new Error('Failed to update invoice total');
  }
};


// Main route
const addMedicineStock = asyncHandler(async (req, res) => {
  const { wholesaler, invoiceNumber, medicine } = req.body;

  if (!wholesaler || !invoiceNumber || !Array.isArray(medicine)) {
  res.status(400);
  throw new Error('Invalid request body');
}


  // 1. Get Wholesaler ID
  const wholesalerId = await getWholesalerIdByName(wholesaler);
  if (!wholesalerId) {
    res.status(400);
    throw new Error('Wholesaler not found. Please register first.');
  }

  // 2. Get or create Invoice
  const invoiceId = await getOrCreateInvoice(invoiceNumber, wholesalerId);
  if (!invoiceId) {
    res.status(400);
    throw new Error('Invoice not found or failed to create.');
  }

  // 3. Insert medicine records
  let totalAmount = 0;

  for (const med of medicine) {
    const {
      packed_type,
      medicine_name,
      brand_name,
      expiry_date,
      batch_no,
      purchase_price,
      mrp,
      mfg_date,
      stock_quantity,
    } = med;

    // Duplicate check
    const checkQuery = `
      SELECT medicine_id FROM medicine_stock
      WHERE packed_type = $1 AND medicine_name = $2 AND brand_name = $3 AND expiry_date = $4 AND batch_no = $5 AND  invoice_id = $6 `;
    const result = await pool.query(checkQuery, [
      packed_type,
      medicine_name,
      brand_name,
      expiry_date,
      batch_no,
      invoiceId
    ]);

    if (result.rowCount > 0) {
      const medicineId = result.rows[0].medicine_id;
      res.status(409);
      throw new Error(`Medicine "${medicine_name}" with batch "${batch_no}" already exists. Use: /admin/medicine_stock/update/${medicineId}`);
    }

    // Insert medicine
    const insertQuery = `
      INSERT INTO medicine_stock (
        packed_type, medicine_name, brand_name, expiry_date, batch_no,
        purchase_price, mrp, mfg_date, stock_quantity, invoice_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `;
    await pool.query(insertQuery, [
      packed_type,
      medicine_name,
      brand_name,
      expiry_date,
      batch_no,
      purchase_price,
      mrp,
      mfg_date,
      stock_quantity,
      invoiceId
    ]);
    if (!purchase_price || !stock_quantity) {
        purchase_price=0;
        stock_quantity=0;
}
totalAmount += Number(purchase_price) * Number(stock_quantity);

    // Total price calc
    totalAmount += Number(purchase_price) * Number(stock_quantity);
  }

  // 4. Update invoice total
    await updateInvoiceTotal(invoiceId, totalAmount);


  res.status(201).json({
    message: 'Medicines added successfully and invoice updated.',
    invoiceId,
    totalAddedAmount: totalAmount
  });
});


//===================================================
//updateMedicine_info
//========================================================


const updateMedicine_info = asyncHandler(async (req, res) => {
  const medicine_id = req.params.id;
  const {
    packed_type,
    medicine_name,
    brand_name,
    expiry_date,
    batch_no,
    purchase_price,
    mrp,
    mfg_date,
    stock_quantity,
    invoice_no
  } = req.body;
  let  chexckBatchnoInvoice =false;
  // Step 1: Get current medicine data
  const { rows: oldRows } = await pool.query(
    'SELECT * FROM medicine_stock WHERE medicine_id = $1',
    [medicine_id]
  );
   
  if (oldRows.length === 0) {
   throw new Error('Medicine not found. Please check the ID.');
  }
    if ( batch_no && invoice_no && batch_no!=oldRows.batch_no &&  invoice_no!=oldMedicine.invoice_no) {
  
    chexckBatchnoInvoice= true;;
  }

  const oldMedicine = oldRows[0];
  const invoiceId = oldMedicine.invoice_id;

  // Step 2: Prepare dynamic SET clause
  const fields = [];
  const values = [];
  let index = 1;

  if (medicine_name) {
    fields.push(`medicine_name = $${index++}`);
    values.push(medicine_name);
  }
  if (brand_name) {
    fields.push(`brand_name = $${index++}`);
    values.push(brand_name);
  }
  if (stock_quantity !== undefined) {
    fields.push(`stock_quantity = $${index++}`);
    values.push(stock_quantity);
  }
  if (mfg_date) {
    fields.push(`mfg_date = $${index++}`);
    values.push(mfg_date);
  }
  if (expiry_date) {
    fields.push(`expiry_date = $${index++}`);
    values.push(expiry_date);
  }
  if (purchase_price !== undefined) {
    fields.push(`purchase_price = $${index++}`);
    values.push(purchase_price);
  }
  if (mrp !== undefined) {
    fields.push(`mrp = $${index++}`);
    values.push(mrp);
  }
    if (batch_no) {
    fields.push(`batch_no = $${index++}`);
    values.push(batch_no);
    chexckBatchno = true;;
  }

  if (packed_type) {
    fields.push(`packed_type = $${index++}`);
    values.push(packed_type);
  }
   
  if (invoice_no) {
    fields.push(`invoice_no = $${index++}`);
    values.push(invoice_no);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update. Please provide at least one field to update.');
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(medicine_id);

  const updateQuery = `
    UPDATE medicine_stock
    SET ${fields.join(', ')}
    WHERE medicine_id = $${index}
    RETURNING *;
  `;

  const { rows: updatedRows } = await pool.query(updateQuery, values);
  const updatedMedicine = updatedRows[0];

  // Step 3: Calculate old and new line totals
  const oldTotal = parseFloat(oldMedicine.purchase_price) * parseInt(oldMedicine.stock_quantity);
 
  const newPurchasePrice = updatedMedicine.purchase_price;
  const newStockQuantity = updatedMedicine.stock_quantity;
  const newTotal = parseFloat(newPurchasePrice) * parseInt(newStockQuantity);
  const delta = newTotal - oldTotal;
   if(chexckBatchnoInvoice){
    const updateBatchQuery = `
    UPDATE invoices
SET total_amount = total_amount - $1
WHERE invoice_id = $2;`;
    const result = await pool.query(updateBatchQuery, [oldTotal, oldRows.invoice_no]);
    if (result.rowCount === 0) {
      throw new Error('Failed to update invoice total for batch number change.');
    }
    const findNewBatchInvoiceQuery = `
    SELECT invoice_id as newinvoice_id FROM invoices WHERE  invoice_no= $1; `;
    const resultNewBatch = await pool.query(findNewBatchInvoiceQuery, [invoice_no]);

  }

  // Step 4: Update invoice total_amount
  await pool.query(
    `
    UPDATE invoices
    SET total_amount = total_amount + $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE invoice_id = $2;
  `,
    [delta, invoiceId]
  );

  res.status(200).json({
    message: 'Medicine updated and invoice total adjusted.',
    updated_medicine: updatedMedicine,
    invoice_adjustment: {
      previous_amount: oldTotal.toFixed(2),
      new_amount: newTotal.toFixed(2),
      delta: delta.toFixed(2)
    }
  });
});



// =======================
// 2. Get All Medicine Stock
// =======================
const handleGetMedicineStockData = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM medicine_stock');

  res.status(200).json({ no_medicine: rows.length, rows });
});

// =======================
// 5. Search Medicine by Query
// =======================
const MedicineSearchQuery = asyncHandler(async (req, res) => {
  const { text, values } = buildMedicineSearchQuery(req.query);
  const result = await pool.query(text, values);

  if (!result.rows.length) {
    // If no rows found, return a 404 status with a message
    return res.status(404).json({ message: 'No matching medicines found' });
  }

  res.json({
    count: result.rows.length,
    data: result.rows,
  });
});
//==================================
//get medicine stock by id
//==================================  
const getMedicineStockById = asyncHandler(async (req, res) => {
  const medicineId = req.params.id;
  const result = await pool.query('SELECT * FROM medicine_stock WHERE medicine_id = $1', [medicineId]);

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Medicine not found' });
  }

  res.json(result.rows[0]);
});



module.exports = { handleGetMedicineStockData, MedicineSearchQuery , addMedicineStock ,updateMedicine_info, getMedicineStockById };
 
