const express = require('express');
const router = express.Router();

//=======================================================//
//reportgeneration route
//=======================================================// 

const {
  handleExcelExport 
} = require('../../controller/excelReport'); // adjust path
router.get('/export/excel', handleExcelExport);


//===========================================================//
//medicine_stock route
//==========================================================//




const { handleExpiringMedicines } = require('../../controller/expiringController'); // adjust path

const { handleGetMedicineStockData,
   MedicineSearchQuery ,
   addMedicineStock,
  updateMedicine_info,
  deleteMedicine
} = require('../../controller/medicine_stock'); // adjust


router.get('/medicine_stock', handleGetMedicineStockData);
router.get('/medicines/search',   MedicineSearchQuery); // adjust path
router.post('/medicine_stock', addMedicineStock); // adjust path
router.put('/medicine_stock/:id', updateMedicine_info); // adjust path
router.delete('/medicine_stock/:id',deleteMedicine);

//===========================================================//
//invoice route
//==========================================================//

const {  handleGetInvoicesData,
  addNewInvoice,
  updateInvoice,
  deleteInvoice,
InvoiceSerach,
} = require('../../controller/invoicesController'); // adjust path

router.get('/invoice',handleGetInvoicesData);
router.put('/invoice/:id', updateInvoice); // adjust path
router.delete('/invoice/:id', deleteInvoice); // adjust path
router.get('/invoicesSearch',InvoiceSerach);

router.get('/expiring_medicines', handleExpiringMedicines); // adjust path

//===========================================================//
//wholeslers route  
//==========================================================//

const { addWholesaler,
    updateWholesalerData ,
    handleGetwholesalersData,
  deleteWholesaler} = require('../../controller/wholesalerController'); // adjust path


router.get('/wholesalers', handleGetwholesalersData);
router.post('/Wholesaler', addWholesaler); // adjust path
router.put('/Wholesaler/:id', updateWholesalerData); // adjust path
router.delete('/Wholesaler/:id', deleteWholesaler); // adjust path
module.exports = router;