#!/usr/bin/env node
// Wrap a tent-design image into an A5 print-ready PDF.
//   - Image preserved at its natural aspect ratio (no distortion)
//   - Fitted to A5 width, centered vertically
//   - Blank bars top/bottom filled with a color sampled from the image
//     edge, so the seam is visually invisible
//
// Usage:  node make-tent-from-image.js [input-image]
//   If no input given, uses images/tent-design.{png,jpg}; else picks the
//   first non-hero image file in images/.

const { PDFDocument, rgb } = require("pdf-lib");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const A5 = [419.53, 595.28]; // A5 portrait in points (148 x 210 mm)
const ROOT = path.resolve(__dirname, "..");
const IMAGES = path.join(ROOT, "images");
const OUT_PATH = path.join(ROOT, "qr", "menu-tent-a5.pdf");

async function main() {
  const inputArg = process.argv[2];
  const inputPath = inputArg
    ? path.resolve(inputArg)
    : pickTentDesign();

  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error("No tent-design image found.");
    console.error("Pass a path as an argument, or drop one into images/.");
    process.exit(1);
  }

  console.log(`Using: ${inputPath}`);
  const imgBytes = fs.readFileSync(inputPath);

  // Check pixel dimensions
  const meta = await sharp(imgBytes).metadata();
  const imgAspect = meta.width / meta.height;
  const pageAspect = A5[0] / A5[1];
  const dpiAtA5Width = meta.width / (A5[0] / 72); // px per inch at A5 width
  console.log(
    `Source: ${meta.width}×${meta.height} ${meta.format}  ` +
      `aspect=${imgAspect.toFixed(3)}  (A5 target ${pageAspect.toFixed(3)})`
  );
  console.log(
    `Effective print resolution at A5 width: ~${Math.round(dpiAtA5Width)} DPI ` +
      `(300 = pro, 150 = acceptable for table tents)`
  );

  // Sample top-left 32x32 region and average to get a representative bg color
  const sampled = await sharp(imgBytes)
    .extract({ left: 0, top: 0, width: Math.min(32, meta.width), height: Math.min(32, meta.height) })
    .resize(1, 1)
    .raw()
    .toBuffer();
  const [r, g, b] = [sampled[0] / 255, sampled[1] / 255, sampled[2] / 255];
  console.log(
    `Edge color sampled: rgb(${sampled[0]}, ${sampled[1]}, ${sampled[2]})`
  );

  // Create PDF
  const doc = await PDFDocument.create();
  const page = doc.addPage(A5);

  // Fill page with sampled edge color (so letterbox bars blend in)
  page.drawRectangle({
    x: 0, y: 0, width: A5[0], height: A5[1],
    color: rgb(r, g, b)
  });

  const isJPEG =
    imgBytes[0] === 0xff && imgBytes[1] === 0xd8 && imgBytes[2] === 0xff;
  const img = isJPEG
    ? await doc.embedJpg(imgBytes)
    : await doc.embedPng(imgBytes);

  // Fit image to page, preserving aspect ratio
  let drawW, drawH;
  if (imgAspect >= pageAspect) {
    // image wider (in aspect) than page — fit to width
    drawW = A5[0];
    drawH = A5[0] / imgAspect;
  } else {
    // image narrower than page — fit to height
    drawH = A5[1];
    drawW = A5[1] * imgAspect;
  }
  const offsetX = (A5[0] - drawW) / 2;
  const offsetY = (A5[1] - drawH) / 2;
  console.log(
    `Image placement: ${drawW.toFixed(1)}×${drawH.toFixed(1)}pt, ` +
      `offset (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})pt`
  );
  if (offsetY > 1) {
    console.log(
      `  → ${(offsetY * 2 / 2.834).toFixed(1)}mm of bars total (top+bottom)`
    );
  }

  page.drawImage(img, {
    x: offsetX, y: offsetY, width: drawW, height: drawH
  });

  const bytes = await doc.save();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, bytes);

  console.log(`\nPDF written: ${OUT_PATH}`);
  console.log(`Size: ${(bytes.length / 1024).toFixed(1)} KB`);
}

function pickTentDesign() {
  // Prefer explicit names first
  for (const name of ["tent-design.png", "tent-design.jpg", "tent.png", "tent.jpg"]) {
    const p = path.join(IMAGES, name);
    if (fs.existsSync(p)) return p;
  }
  // Else find the first non-hero image in images/
  if (!fs.existsSync(IMAGES)) return null;
  const files = fs.readdirSync(IMAGES).filter(f =>
    /\.(png|jpe?g|webp)$/i.test(f) && !/^hero\./i.test(f)
  );
  if (files.length === 0) return null;
  return path.join(IMAGES, files[0]);
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
