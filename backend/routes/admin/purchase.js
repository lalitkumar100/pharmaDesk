const express = require('express');
const router = express.Router();
const {
  handleExcelExport,
  handleGetMedicineStockData,
  handleGetwholesalersData,
  handleGetInvoicesData,
    MedicineSearchQuery,
} = require('../../controller/purchaseController'); // adjust path

const { handleExpiringMedicines } = require('../../controller/expiringController'); // adjust path

router.get('/export/excel', handleExcelExport);
router.get('/data/medicine_stock', handleGetMedicineStockData);
router.get('/data/wholesalers', handleGetwholesalersData);
router.get('/data/invoices',handleGetInvoicesData);
router.get('/data/expiring_medicines', handleExpiringMedicines); // adjust path
router.get('/data/medicines/search',   MedicineSearchQuery); // adjust path


module.exports = router;