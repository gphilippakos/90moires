#!/usr/bin/env node
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const imagesDir = path.resolve(__dirname, "..", "images");
const TARGET_SIZE = 800;
const QUALITY = 80;

if (!fs.existsSync(imagesDir)) {
  console.error(`No images/ directory at ${imagesDir}`);
  process.exit(1);
}

const files = fs.readdirSync(imagesDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));

if (files.length === 0) {
  console.log("No images to optimize.");
  process.exit(0);
}

console.log(`Optimizing ${files.length} image(s) — target ${TARGET_SIZE}×${TARGET_SIZE}, JPG @ ${QUALITY}%\n`);

(async () => {
  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const input = fs.readFileSync(filePath);
    const originalSize = input.length;
    totalBefore += originalSize;

    const output = await sharp(input)
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover", position: "centre" })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    const outName = file.replace(/\.(png|webp)$/i, ".jpg");
    const outPath = path.join(imagesDir, outName);
    fs.writeFileSync(outPath, output);
    if (outName !== file) fs.unlinkSync(filePath);
    totalAfter += output.length;

    const saved = Math.round(100 * (1 - output.length / originalSize));
    console.log(`  ${file.padEnd(24)} ${fmt(originalSize).padStart(8)} → ${fmt(output.length).padStart(8)}  (${saved}% saved)`);
  }

  const totalSaved = Math.round(100 * (1 - totalAfter / totalBefore));
  console.log(`\nTotal: ${fmt(totalBefore)} → ${fmt(totalAfter)}  (${totalSaved}% saved)`);
})();

function fmt(bytes) {
  return (bytes / 1024).toFixed(0) + " KB";
}
