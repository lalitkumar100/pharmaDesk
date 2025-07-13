const pool = require('../config/db');
const asyncHandler = require('../serivces/asyncHandler');
const {
  fetchTableData,
  generateExcelFromData,
  sendExcelResponse,
} = require('../serivces/excelReportSerivce');
const { buildMedicineSearchQuery } = require('../serivces/MedicineSearchQuery');
// 1. Export Excel
const handleExcelExport = asyncHandler(async (req, res) => {
  const tableName = req.query.table;
  if (!tableName) {
    res.status(400);
    throw new Error('Table name is required');
  }

  const data = await fetchTableData(tableName);
  const workbook = await generateExcelFromData(data, tableName);
  await sendExcelResponse(res, workbook, tableName);
});

// 2. Get medicine_stock JSON
const handleGetMedicineStockData = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM medicine_stock');
  if (!rows || rows.length === 0) {
    res.status(404);
    throw new Error('No medicine stock data found');
  }
  res.status(200).json({no_medicine:rows.length,rows});
});

// 3. Get vendor JSON
const handleGetwholesalersData = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM wholesalers');
  if (!rows || rows.length === 0) {
    res.status(404);
    throw new Error('No vendor data found');
  }
  res.status(200).json({no_vendors:rows.length,rows});
});

const handleGetInvoicesData = asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM invoices');
  if (!rows || rows.length === 0) {
    res.status(404);
    throw new Error('No invoice data found');
  }
  res.status(200).json({no_invoices:rows.length,rows});
});

const MedicineSearchQuery = asyncHandler(async (req, res) => {
    const { text, values } = buildMedicineSearchQuery(req.query);
    const result = await pool.query(text, values);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'No matching medicines found' });
    }

    res.json({
      count: result.rows.length,
      data: result.rows,
    });
  });

module.exports = {
  handleExcelExport,
  handleGetMedicineStockData,
  handleGetwholesalersData,
  handleGetInvoicesData,
  MedicineSearchQuery,

};
