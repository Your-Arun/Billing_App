const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
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
    const { htmlContent } = req.body;

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'statements', resource_type: 'raw' },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      ).end(pdfBuffer);
    });

    const record = await Statement.create({
      ...req.body,
      pdfUrl: uploadRes.secure_url
    });

    res.status(201).json({ success: true, record });

  } catch (err) {
    console.error("PDF ERROR FULL:", err);
    res.status(500).json({
      msg: "PDF save failed",
      error: err.message
    });
  }
});



module.exports = router;
