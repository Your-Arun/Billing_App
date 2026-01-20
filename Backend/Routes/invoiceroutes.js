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
      htmlContent,
    } = req.body;

    if (!adminId || !htmlContent) {
      return res.status(400).json({ msg: "adminId or HTML missing" });
    }

    // 1️⃣ Launch browser (Render safe)
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // 2️⃣ Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // 3️⃣ Upload PDF to Cloudinary
    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "statements",
          resource_type: "raw",
          format: "pdf",
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      ).end(pdfBuffer);
    });

    if (!uploadRes?.secure_url) {
      throw new Error("Cloudinary upload failed");
    }

    // 4️⃣ Save DB (HTML + PDF both)
    const saved = await Statement.create({
      adminId,
      tenantId,
      tenantName,
      meterId,
      periodFrom,
      periodTo,
      units,
      totalAmount,
      htmlContent, // ✅ SAME HTML FORMAT SAVED
      pdfUrl: uploadRes.secure_url,
    });

    res.status(201).json({
      success: true,
      data: saved,
    });

  } catch (err) {
    console.error("PDF ERROR FULL:", err);
    res.status(500).json({
      msg: "PDF save failed",
      error: err.message,
    });
  }
});

module.exports = router;
