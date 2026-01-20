const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const Statement = require('../Modals/Invoice');
require('dotenv').config(); 
const puppeteer = require("puppeteer");
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

router.post("/save", async (req, res) => {
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

    if (!adminId || !htmlContent) {
      return res.status(400).json({ msg: "adminId or HTML missing" });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // upload pdfBuffer to Cloudinary → pdfUrl

    const saved = await Statement.create({
      adminId,
      tenantId,
      tenantName,
      meterId,
      periodFrom,
      periodTo,
      units,
      totalAmount,
      htmlContent,   // ✅ HTML saved
      pdfUrl
    });

    res.json({ success: true, data: saved });

  } catch (err) {
    console.error("PDF ERROR FULL:", err);
    res.status(500).json({ msg: "PDF save failed", error: err.message });
  }
});




module.exports = router;
