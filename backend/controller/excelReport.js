// =======================
// Module Imports
// =======================

const asyncHandler = require('../services/asyncHandler');

const {
  fetchTableData,
  generateExcelFromData,
  sendExcelResponse,
  
} = require('../services/excelReportSerivce');





// =======================
// 1. Export Excel for Any Table
// =======================
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


// =======================
// Module Exports
// =======================
module.exports = {
  handleExcelExport,
};
