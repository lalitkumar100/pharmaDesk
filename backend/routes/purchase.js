const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require("multer");
const pool = require('../config/db');

//=======================================================//
//reportgeneration route
//=======================================================// 

const {
  handleExcelExport 
} = require('../controller/excelReport'); // adjust path
router.get('/export/excel', handleExcelExport);


//===========================================================//
//medicine_stock route
//==========================================================//





const { handleGetMedicineStockData,
   getFilteredMedicines ,
   addMedicineStock,
  updateMedicine_info,
  deleteMedicine,
  getMedicineInfoById,
 recommondationMedicineName
} = require('../controller/medicine_stock'); // adjust


router.get('/medicine_stock', handleGetMedicineStockData);
router.get('/medicne_info/:Id',getMedicineInfoById);
router.get('/medicines/search',   getFilteredMedicines); // adjust path
router.post('/medicine_stock', addMedicineStock); // adjust path
router.put('/medicine_stock/:id', updateMedicine_info); // adjust path
router.delete('/medicine_stock/:id',deleteMedicine);
router.get('/medicines/recommendation',recommondationMedicineName);

//===========================================================//
//invoice route
//==========================================================//

const {  handleGetInvoicesData,
  updateInvoice,
  deleteInvoice,
InvoiceSerach,
getInvoiceById 
} = require('../controller/invoicesController'); // adjust path
router.put('/invoice/:id', updateInvoice);
router.delete('/invoice/:id', deleteInvoice); // adjust path
router.get('/invoicesSearch',InvoiceSerach);
router.get('/invoices', handleGetInvoicesData); // adjust path
router.get('/invoice/:id', getInvoiceById); // adjust path
//===========================================================//
//expiring route  
//==========================================================//
const { handleExpiringMedicines, removeExpiringMedicines } = require('../controller/expiringController'); // adjust path
router.get('/expiring_medicines', handleExpiringMedicines); // adjust path
router.delete('/expiring_medicines/:id', removeExpiringMedicines); // adjust

//===========================================================//
//wholeslers route  
//==========================================================//

const { addWholesaler,

    handleGetwholesalersData,
  deleteWholesaler} = require('../controller/wholesalerController'); // adjust path


router.get('/wholesalers', handleGetwholesalersData);
router.post('/Wholesaler', addWholesaler); // adjust path

router.delete('/Wholesaler/:id', deleteWholesaler); // adjust path


//===========================================================//
//employee route
//==========================================================//
const { addEmployee,updateEmployee,hardDeleteEmployee,searchEmployees,getAllEmployeeBasicInfo,getEmployeeInfoById } = require('../controller/employeeController'); // adjust path
router.post('/employee', addEmployee); // adjust path
router.put('/employee/:id', updateEmployee); // adjust path
router.delete('/employee/:id', hardDeleteEmployee); // adjust path
router.get('/employeeSearch',searchEmployees);
router.get('/allEmployee',getAllEmployeeBasicInfo);
router.get('/employee/:id',getEmployeeInfoById);


//===========================================================//
//sales route
//==========================================================//  
const {  processSale ,softDeleteSale,handleGetSalesData,AllSales,getSaleSummaryByID ,searchSales} = require('../controller/salesController'); // adjust path
router.post('/sales', processSale); // adjust path
router.get('/sales', handleGetSalesData); // adjust path')
router.delete('/sales/:id',softDeleteSale);
router.get('/sales/serach', AllSales); // adjust path
router.get('/sales/:id',getSaleSummaryByID);
router.get('sales/serach',searchSales);


//====================================================//
//todo
//=====================================================//
// const todoRoutes = require('../feature/todo');
// app.use('/todos', todoRoutes);


//=====================================================//
//profile
//====================================================//

// --- GEMINI API SETUP ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- MULTER SETUP (for file uploads) ---
// We'll store the file in memory and pass the buffer directly to Gemini
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Helper function to convert a buffer to a Gemini-compatible FilePart.
 * @param {Buffer} buffer The file buffer.
 * @param {string} mimeType The MIME type of the file (e.g., "image/jpeg", "application/pdf").
 * @returns { {inlineData: { data: string, mimeType: string }} }
 */
function fileToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}


// --- NEW API ENDPOINT for Invoice Processing ---
router.post("/api/process-invoice", upload.single("invoice"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  try {
    // For this use case, gemini-1.5-pro is excellent due to its large context and multimodal understanding
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const prompt = `
      You are an expert data entry assistant for a pharmacy. Analyze the provided invoice file (which can be an image or a PDF).
      Extract the following information:
      1. Wholesaler or Distributor Name
      2. Invoice Number
      3. Invoice Date
      4. A list of all medicine items. For each medicine, extract:
          - Medicine Name (the generic or commercial name)
          - Brand Name (if different from medicine name)
          - Manufacturing Date (mfg_date)
          - Expiry Date (expiry_date)
          - Packed Type (e.g., 'Strip', 'Box', 'Bottle')
          - Stock Quantity (qty)
          - Purchase Price per unit
          - MRP (Maximum Retail Price) per unit
          - Batch Number (batch_no)

      Return the extracted data STRICTLY as a single JSON object. Do not include any explanatory text, comments, or markdown formatting like \`\`\`json.
      The JSON object must follow this exact structure:
      {
        "wholesaler": "string",
        "invoiceNumber": "string",
        "date": "YYYY-MM-DD",
        "medicines": [
          {
            "medicine_name": "string",
            "brand_name": "string",
            "mfg_date": "YYYY-MM-DD",
            "expiry_date": "YYYY-MM-DD",
            "packed_type": "string",
            "stock_quantity": "number",
            "purchase_price": "number",
            "mrp": "number",
            "batch_no": "string"
          }
        ]
      }
      If any piece of information is not found in the invoice, return an empty string "" or null for that field. Ensure dates are in YYYY-MM-DD format.
    `;

    const filePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);

    const result = await model.generateContent([prompt, filePart]);
    const responseText = result.response.text();
    
    // Clean the response to ensure it's valid JSON
    const cleanedJsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const data = JSON.parse(cleanedJsonString);

    res.status(200).json(data);

  } catch (error) {
    console.error("Error processing invoice with Gemini:", error);
    res.status(500).json({ message: "Failed to process invoice. The AI model could not read the document." });
  }
});



// Route to handle chat requests
router.post('/api/chat', async (req, res) => {
    try {
        const { messages, image, mimeType } = req.body;
        
        // Determine the model based on the presence of an image
        const modelName = image ? 'gemini-1.5-flash-latest' : 'gemini-1.5-flash-latest';
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const chatHistory = messages.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(part => {
                if (part.inlineData) {
                    return {
                        inlineData: {
                            mimeType: part.inlineData.mimeType,
                            data: part.inlineData.data
                        }
                    };
                }
                return { text: part.text };
            })
        }));

        let contents = [];

        if (image && mimeType) {
            contents.push({
                role: 'user',
                parts: [
                    { text: messages[0].parts[0].text },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: image,
                        },
                    },
                ],
            });
        } else {
            contents = messages;
        }

        const result = await model.generateContent({ contents });
        const response = result.response;
        const text = response.text();

        res.status(200).json({ text });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'Failed to get response from Gemini API.' });
    }
});

router.get('/wholesaler/:id', async (req, res) => {
  const wholesalerId = parseInt(req.params.id);

  if (isNaN(wholesalerId)) {
    return res.status(400).json({ error: 'Invalid wholesaler ID' });
  }

  try {
    const query = `
      WITH selected_wholesaler AS (
          SELECT
              w.wholesaler_id,
              w.name AS wholesaler_name,
              w.gst_no,
              w.address,
              w.contact AS contact_no,
              w.email AS email_address,
              COALESCE(SUM(i.total_amount), 0) AS stock_import,
              COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS unpaid_amount
          FROM
              wholesalers w
          LEFT JOIN
              invoices i ON w.wholesaler_id = i.wholesaler_id AND i.deleted_at IS NULL
          WHERE
              w.deleted_at IS NULL
              AND w.wholesaler_id = $1
          GROUP BY
              w.wholesaler_id
      )

      SELECT
          sw.wholesaler_id,
          sw.wholesaler_name,
          sw.gst_no,
          sw.contact_no,
          sw.email_address,
          sw.address,
          sw.stock_import,
          sw.unpaid_amount,
          i.invoice_no,
          i.total_amount,
          i.invoice_date
      FROM
          selected_wholesaler sw
      LEFT JOIN
          invoices i ON sw.wholesaler_id = i.wholesaler_id AND i.deleted_at IS NULL
      ORDER BY
          i.invoice_date DESC;
    `;

    const result = await pool.query(query, [wholesalerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wholesaler not found' });
    }

    // Separate wholesaler details and invoice list
    const { 
      wholesaler_id,
      wholesaler_name,
      gst_no,
      contact_no,
      email_address,
      address,
      stock_import,
      unpaid_amount
    } = result.rows[0];

    const invoices = result.rows.map(row => ({
      invoice_no: row.invoice_no,
      total_amount: row.total_amount,
      invoice_date: row.invoice_date
    })).filter(inv => inv.invoice_no); // remove nulls if no invoices

    return res.json({
      wholesaler: {
        wholesaler_id,
        wholesaler_name,
        gst_no,
        contact_no,
        email_address,
        address,
        stock_import,
        unpaid_amount,
        invoices
      }
      
    });

  } catch (err) {
    console.error('Error fetching wholesaler:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;