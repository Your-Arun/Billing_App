const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Invoice = require('../Modals/Invoice');
const mongoose = require('mongoose');

// 1. Cloudinary Config (Aapke provided logic ke hisab se)
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'invoice', 
    format: 'pdf', // Change to 'pdf'
    resource_type: 'raw' // PDF ke liye 'raw' ya 'auto' zaroori hota hai
  },
});

const upload = multer({ storage: storage });

// 2. Single Invoice Upload API
router.post('/upload-single', upload.single('invoiceFile'), async (req, res) => {
    try {
        const { adminId, tenantId, tenantName, amount, units, month, dateRange, meterId, opening, closing, multiplier } = req.body;

        if (!req.file) return res.status(400).json({ msg: "File upload failed" });

        // Database mein entry save karein
        const newInvoice = new Invoice({
            adminId: new mongoose.Types.ObjectId(adminId),
            tenantId: new mongoose.Types.ObjectId(tenantId),
            tenantName,
            meterId,
            amount: Number(amount),
            units: Number(units),
            opening: Number(opening),
            closing: Number(closing),
            multiplier: Number(multiplier),
            month,
            dateRange,
            pdfUrl: req.file.path // Cloudinary URL
        });

        await newInvoice.save();
        res.status(201).json({ success: true, msg: "Invoice uploaded and saved! ✅", data: newInvoice });

    } catch (err) {
        console.error("Upload Error:", err.message);
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;