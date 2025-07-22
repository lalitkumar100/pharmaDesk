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
  try {
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
  } catch (error) {
    throw new Error('Failed to get or create invoice');
    
  }
};

const updateInvoiceTotal = async (invoiceId, Amount) => {
  try {
    const query = `UPDATE invoices
      SET total_amount =total_amount+ $1 
      WHERE invoice_id = $2;
    `;
    await pool.query(query, [Amount, invoiceId]); // ✅ Correct variable
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

  // 1. Wholesaler check
  const wholesalerId = await getWholesalerIdByName(wholesaler);
  if (!wholesalerId) {
    res.status(400);
    throw new Error('Wholesaler not found. Please register first.');
  }

  // 2. Get or create invoice
  const invoiceId = await getOrCreateInvoice(invoiceNumber, wholesalerId);
  if (!invoiceId) {
    res.status(400);
    throw new Error('Invoice not found or failed to create.');
  }

  // 3. Prepare to insert
  let totalAmount = 0;

  // In-memory duplicate check
  const seenMedicines = new Set();

  for (const med of medicine) {
    const {
      packed_type,
      medicine_name,
      brand_name,
      expiry_date,
      batch_no,
      purchase_price = 0,
      mrp,
      mfg_date,
      stock_quantity = 0,
    } = med;

    // In-request duplicate key
    const key = `${packed_type}|${medicine_name}|${brand_name}|${expiry_date}|${batch_no}`;
    if (seenMedicines.has(key)) {
      res.status(409);
      throw new Error(`Duplicate medicine "${medicine_name}" with batch "${batch_no}" found in request.`);
    }
    seenMedicines.add(key);

    // DB duplicate check
    const checkQuery = `
      SELECT medicine_id FROM medicine_stock
      WHERE packed_type = $1 AND medicine_name = $2 AND brand_name = $3  AND batch_no = $4 AND invoice_id = $5
    `;
    const result = await pool.query(checkQuery, [
      packed_type,
      medicine_name,
      brand_name,
      batch_no,
      invoiceId,
    ]);

    if (result.rowCount > 0) {
      const medicineId = result.rows[0].medicine_id;
      res.status(409);
      throw new Error(`Medicine "${medicine_name}" with batch "${batch_no}" already exists. Use: /admin/medicine_stock/update/${medicineId}`);
    }

    // Insert medicine
    const insertQuery = `
      INSERT INTO medicine_stock (
        packed_type,
        medicine_name, 
        brand_name, 
        expiry_date,
        batch_no,
        purchase_price, 
        mrp, 
        mfg_date, 
        stock_quantity, 
        invoice_id,
        invoice_no
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
      invoiceId,
      invoiceNumber
    ]);

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
  } = req.body;

  // Step 1: Get current medicine data
  const { rows: oldRows } = await pool.query(
    'SELECT * FROM medicine_stock WHERE medicine_id = $1',
    [medicine_id]
  );
  
  if (oldRows.length === 0) {
   throw new Error('Medicine not found. Please check the ID.');
  }
  const oldMedicine = oldRows[0];

  
  const invoiceId =oldRows[0].invoice_id;
  let checkPurchasePrice = false;
  let checkStock_quantity = false;

  // Step 2: Prepare dynamic SET clause
  const fields = [];
  const values = [];
  let index = 1;

  if (medicine_name && medicine_name !== oldMedicine.medicine_name) {
    fields.push(`medicine_name = $${index++}`);
    values.push(medicine_name);
  }
  if (brand_name && brand_name !== oldMedicine.brand_name) {
    fields.push(`brand_name = $${index++}`);
    values.push(brand_name);
  }
  if (stock_quantity !== undefined && stock_quantity !== oldMedicine.stock_quantity) {
    fields.push(`stock_quantity = $${index++}`);
    values.push(stock_quantity);
    checkStock_quantity = true;
  }
  if (mfg_date && mfg_date !== oldMedicine.mfg_date) {
    fields.push(`mfg_date = $${index++}`);
    values.push(mfg_date);
  }
  if (expiry_date && expiry_date !== oldMedicine.expiry_date) {
    fields.push(`expiry_date = $${index++}`);
    values.push(expiry_date);
  }
  if (purchase_price !== undefined && purchase_price !== oldMedicine.purchase_price) {
    fields.push(`purchase_price = $${index++}`);
    values.push(purchase_price);
    checkPurchasePrice = true;
  }
  if (mrp !== undefined && mrp !== oldMedicine.mrp) {
    fields.push(`mrp = $${index++}`);
    values.push(mrp);
  }
    if (batch_no && batch_no !== oldMedicine.batch_no) {
    fields.push(`batch_no = $${index++}`);
    values.push(batch_no);
  }

  if (packed_type && packed_type !== oldMedicine.packed_type) {
    fields.push(`packed_type = $${index++}`);
    values.push(packed_type);
  }

   

  if (fields.length === 0) {
    throw new Error('No fields to update. Please provide at least one field to update.');
  }

  values.push(medicine_id);

  const updateQuery = `
    UPDATE medicine_stock
    SET ${fields.join(', ')}
    WHERE medicine_id = $${index}
    RETURNING *;
  `;
  
  const updatedMedicine =await pool.query(updateQuery,values).rows;
  let invoice_adjustment;
//there change in stock and purchase price 
  if(checkPurchasePrice || checkStock_quantity ){
  // Step 3: Calculate old and new line totals

    const oldTotal = parseFloat(oldMedicine.purchase_price) * parseInt(oldMedicine.stock_quantity);
 const newPurchasePrice = purchase_price !== undefined ? purchase_price : oldMedicine.purchase_price;
const newStockQuantity = stock_quantity !== undefined ? stock_quantity : oldMedicine.stock_quantity;
const newTotal = newPurchasePrice * newStockQuantity;
const delta = newTotal -oldTotal;

   await updateInvoiceTotal(invoiceId, delta);
      invoice_adjustment ={
      previous_amount: oldTotal.toFixed(2),
      new_amount: newTotal.toFixed(2),
      delta: delta.toFixed(2)
    }
 

  }


   res.status(200).json({
    message: 'Medicine updated and invoice total adjusted.',
    updated_medicine: updatedMedicine,
    invoice_adjustment: invoice_adjustment
  });


});



// =======================
// 2. Get All Medicine Stock
// =======================
const handleGetMedicineStockData = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM medicine_stock');

  res.status(200).json({ no_medicine: rows.length, rows });
});

//================================================================
//delete medicine
//===============================================================
const deleteMedicine = asyncHandler(async (req, res) => {
  const medicine_id = req.params.id;

  const checkMedicine = `SELECT * FROM medicine_stock WHERE medicine_id = $1;`;
  const { rows: medicine } = await pool.query(checkMedicine, [medicine_id]);

  if (medicine.length === 0) {
    throw new Error(`Medicine not found with id ${medicine_id}`);
  }

  const deleteQuery = `DELETE FROM medicine_stock WHERE medicine_id = $1;`;
  await pool.query(deleteQuery, [medicine_id]);

  const invoice_id = medicine[0].invoice_id;
  const stock_quantity = parseFloat(medicine[0].stock_quantity);
  const purchase_price = parseFloat(medicine[0].purchase_price);
  const delta = -1 * (stock_quantity * purchase_price);
  console.log(`Delta for invoice adjustment: ${delta}`);

  await updateInvoiceTotal(invoice_id, delta);

  res.status(200).json({
    status: "success",
    message: `Deleted medicine with id ${medicine_id}`,
  });
});



//===============================================================
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


module.exports = { handleGetMedicineStockData, MedicineSearchQuery , addMedicineStock ,updateMedicine_info,deleteMedicine };
 
