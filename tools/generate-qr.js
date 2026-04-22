#!/usr/bin/env node
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

const url = process.argv[2];

if (!url) {
  console.error("Usage: npm run qr -- <https://your-menu-url>");
  console.error("Example: npm run qr -- https://my-restaurant.vercel.app");
  process.exit(1);
}

try {
  new URL(url);
} catch {
  console.error(`Invalid URL: ${url}`);
  process.exit(1);
}

const outDir = path.resolve(__dirname, "..", "qr");
fs.mkdirSync(outDir, { recursive: true });

const pngPath = path.join(outDir, "menu-qr.png");
const svgPath = path.join(outDir, "menu-qr.svg");

const options = {
  errorCorrectionLevel: "H",
  margin: 2,
  scale: 16,
  color: { dark: "#0b3d5c", light: "#ffffff" }
};

Promise.all([
  QRCode.toFile(pngPath, url, options),
  QRCode.toFile(svgPath, url, { ...options, type: "svg" })
])
  .then(() => {
    console.log(`QR code generated for: ${url}`);
    console.log(`  PNG: ${pngPath}`);
    console.log(`  SVG: ${svgPath}`);
    console.log("");
    console.log("Print the PNG at the highest quality your printer supports.");
    console.log("The SVG scales to any size without losing quality.");
  })
  .catch(err => {
    console.error("Failed to generate QR code:", err);
    process.exit(1);
  });
