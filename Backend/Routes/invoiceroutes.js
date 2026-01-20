const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;
const Statement = require('../Modals/Invoice');
require('dotenv').config(); 

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

router.post('/save', async (req, res) => {
  try {
    const {
      adminId,
      tenantId,
      tenantName,
      meterId,
      periodFrom,
      periodTo,
      units,
      totalAmount,
      htmlContent
    } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ msg: "HTML content missing" });
    }

    // 🧠 1. Generate PDF from HTML
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px' }
    });

    await browser.close();

    // ☁️ 2. Upload to Cloudinary
    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'statements',
          resource_type: 'raw',
          format: 'pdf'
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      ).end(pdfBuffer);
    });

    // 🗄️ 3. Save DB record
    const record = await Statement.create({
      adminId,
      tenantId,
      tenantName,
      meterId,
      periodFrom,
      periodTo,
      units,
      totalAmount,
      pdfUrl: uploadRes.secure_url,
      htmlContent
    });

    res.status(201).json({ success: true, record });
console.log("HTML received length:", htmlContent?.length);
  } catch (err) {
    console.error("Statement Save Error:", err);
    res.status(500).json({ msg: "PDF save failed" });
  }
});

module.exports = router;
