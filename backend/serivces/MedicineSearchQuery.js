/**
 * Build a parameterized SQL query for searching medicines,
 * with optional filtering, pagination, and sorting.
 *
 * @param {Object} params - Query parameters from req.query
 * @returns {Object}      - { text: SQL string, values: parameter values }
 */

function buildMedicineSearchQuery(params) {
  const {
    medicine_id,
    medicine_name,
    brand_name,
    batch_no,
    invoice_id,
    invoice_no,
    purchase_price,
    mrp,
    payment_status,
    payment_date,
    wholesaler_name,
        // NEW: date range filters
    invoice_date_from,
    invoice_date_to,

    // pagination & sorting
    limit,
    offset,
    order_by,
    order_dir,
  } = params;

  let text = `
    SELECT 
      ms.medicine_id,
      ms.medicine_name,
      ms.brand_name,
      ms.batch_no,
      ms.invoice_id,
      ms.purchase_price,
      ms.mrp,
      ms.expiry_date,
      i.invoice_no,
      i.payment_status,
      i.payment_date,
      i.invoice_date,
      w.name AS wholesaler_name
    FROM medicine_stock ms
    JOIN invoices i ON ms.invoice_id = i.invoice_id
    JOIN wholesalers w ON i.wholesaler_id = w.wholesaler_id
    WHERE 1=1
  `;

  const values = [];
  let idx = 1;

  // -- filters --
  if( medicine_id) {
    text += ` AND ms.medicine_id = $${idx++}`;
    values.push(medicine_id);
  };
  if (medicine_name) {
    text += ` AND ms.medicine_name ILIKE $${idx++}`;
    values.push(`%${medicine_name}%`);
  }

  if (brand_name) {
    text += ` AND ms.brand_name ILIKE $${idx++}`;
    values.push(`%${brand_name}%`);
  }

  if (batch_no) {
    text += ` AND ms.batch_no ILIKE $${idx++}`;
    values.push(`%${batch_no}%`);
  }



  if (invoice_no) {
    text += ` AND i.invoice_no ILIKE $${idx++}`;
    values.push(`%${invoice_no}%`);
  }

  if (purchase_price) {
    text += ` AND ms.purchase_price = $${idx++}`;
    values.push(purchase_price);
  }

  if (mrp) {
    text += ` AND ms.mrp = $${idx++}`;
    values.push(mrp);
  }

  if (payment_status) {
    text += ` AND i.payment_status = $${idx++}`;
    values.push(payment_status);
  }

  if (payment_date) {
    text += ` AND i.payment_date = $${idx++}`;
    values.push(payment_date); // you can validate format before if needed
  }
    if (invoice_date_from) {
    text += ` AND i.invoice_date >= $${idx++}`;
    values.push(invoice_date_from);
  }

  if (invoice_date_to) {
    text += ` AND i.invoice_date <= $${idx++}`;
    values.push(invoice_date_to);
  }

  if (wholesaler_name) {
    text += ` AND w.name ILIKE $${idx++}`;
    values.push(`%${wholesaler_name}%`);
  }

  // -- sorting --
  const allowedOrderColumns = new Set([
    'medicine_name',
    'brand_name',
    'expiry_date',
    'purchase_price',
    'mrp',
    'invoice_no',
    'payment_status',
    'payment_date',
  ]);
  const col = allowedOrderColumns.has(order_by) ? order_by : 'expiry_date';
  const dir = order_dir && order_dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  text += ` ORDER BY ms.${col} ${dir}`;

  // -- pagination --
  if (limit && !isNaN(parseInt(limit))) {
    text += ` LIMIT $${idx++}`;
    values.push(parseInt(limit, 10));
  }

  if (offset && !isNaN(parseInt(offset))) {
    text += ` OFFSET $${idx++}`;
    values.push(parseInt(offset, 10));
  }

  return { text, values };
}

module.exports = {buildMedicineSearchQuery };
