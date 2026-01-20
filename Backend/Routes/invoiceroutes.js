const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const Statement = require("../Modals/Invoice");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});


router.post("/save", async (req, res) => {
  let browser;
  try {
    const { adminId, tenantId, tenantName, meterId, periodFrom, periodTo, units, totalAmount, htmlContent } = req.body;

    // 1️⃣ PDF generation logic
    browser = await puppeteer.launch({
      args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // 2️⃣ Upload to Cloudinary
    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        folder: "invoices",
        resource_type: "raw",
        public_id: `Inv_${tenantName}_${Date.now()}`
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }).end(pdfBuffer);
    });

    // 3️⃣ Save to Database
    const saved = await Statement.create({
      adminId,
      tenantId,
      tenantName,
      meterId,
      periodFrom,
      periodTo,
      units,
      totalAmount,
      htmlContent,
      pdfUrl: uploadRes.secure_url,
    });

    res.status(201).json({ success: true, data: saved });

  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ msg: "Save failed", error: err.message });
  }
});


router.get("/history/:adminId", async (req, res) => {
  try {
    const statements = await Statement.find({
      adminId: req.params.adminId
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(statements);
  } catch (e) {
    res.status(500).json({ msg: "Failed to fetch history" });
  }
});


module.exports = router;
