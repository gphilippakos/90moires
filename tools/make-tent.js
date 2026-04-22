#!/usr/bin/env node
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const A5 = [419.53, 595.28];

const RESTAURANT = "Taverna 90 Moires";
const LOCATION = "GYTHIO · MANI · SINCE 1959";
const URL_TEXT = process.env.MENU_URL || "90moires.vercel.app";
const SCAN_EN = "SCAN FOR MENU";
const SCAN_TRANSLATIONS = [
  "Escanea la carta",
  "Speisekarte scannen",
  "Scannez la carte",
  "Scansiona il menù",
  "Digitalize a ementa"
];

// Sea palette to match the site
const COLORS = {
  bg:     rgb(0.941, 0.910, 0.839),  // --paper  #f0e8d6
  accent: rgb(0.106, 0.353, 0.529),  // --sea    #1b5a87
  warm:   rgb(0.055, 0.239, 0.388),  // --sea-deep
  gold:   rgb(0.761, 0.604, 0.227),  // --gold   #c29a3a
  soft:   rgb(0.231, 0.333, 0.431)   // --ink-soft
};

const QR_PATH = path.resolve(__dirname, "..", "qr", "menu-qr.png");
const OUT_PATH = path.resolve(__dirname, "..", "qr", "menu-tent-a5.pdf");

if (!fs.existsSync(QR_PATH)) {
  console.error(`QR code not found at ${QR_PATH}`);
  console.error("Run `npm run qr -- <URL>` first.");
  process.exit(1);
}

async function main() {
  const doc = await PDFDocument.create();
  const page = doc.addPage(A5);
  const W = page.getWidth();
  const H = page.getHeight();

  const timesBold     = await doc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica     = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COLORS.bg });

  const cx = W / 2;

  const BRAND_SIZE = 32;
  const LOC_SIZE = 9;
  const SCAN_SIZE = 22;
  const LANG_SIZE = 9.5;
  const URL_SIZE = 9;
  const QR_SIZE = 250;

  const GAP_AFTER_BRAND = 14;
  const GAP_AFTER_LOC   = 22;
  const GAP_AFTER_ORN   = 26;
  const GAP_AFTER_SCAN  = 16;
  const GAP_AFTER_LANG  = 8;
  const GAP_LANG_LINE   = 14;
  const GAP_BEFORE_QR   = 14;
  const GAP_AFTER_QR    = 18;

  const langMid = Math.ceil(SCAN_TRANSLATIONS.length / 2);
  const line1 = SCAN_TRANSLATIONS.slice(0, langMid).join("   ·   ");
  const line2 = SCAN_TRANSLATIONS.slice(langMid).join("   ·   ");
  const langLines = line2 ? 2 : 1;

  const totalYDeltas =
    (BRAND_SIZE * 0.25 + GAP_AFTER_BRAND) +
    GAP_AFTER_LOC +
    GAP_AFTER_ORN +
    (SCAN_SIZE * 0.25 + GAP_AFTER_SCAN) +
    (langLines - 1) * GAP_LANG_LINE +
    GAP_AFTER_LANG + GAP_BEFORE_QR + QR_SIZE + GAP_AFTER_QR;

  const contentHeight = BRAND_SIZE * 0.75 + totalYDeltas + URL_SIZE * 0.25;
  const topMargin = (H - contentHeight) / 2;

  let y = H - topMargin - BRAND_SIZE * 0.75;
  drawCenteredText(page, RESTAURANT, timesBold, BRAND_SIZE, COLORS.accent, cx, y);

  y -= BRAND_SIZE * 0.25 + GAP_AFTER_BRAND;
  drawCenteredText(page, LOCATION, helveticaBold, LOC_SIZE, COLORS.gold, cx, y, 2.4);

  y -= GAP_AFTER_LOC;
  drawWaveOrnament(page, cx, y, COLORS.accent);

  y -= GAP_AFTER_ORN;
  drawCenteredText(page, SCAN_EN, helveticaBold, SCAN_SIZE, COLORS.warm, cx, y, 1.5);

  y -= SCAN_SIZE * 0.25 + GAP_AFTER_SCAN;
  drawCenteredText(page, line1, helvetica, LANG_SIZE, COLORS.soft, cx, y);

  if (line2) {
    y -= GAP_LANG_LINE;
    drawCenteredText(page, line2, helvetica, LANG_SIZE, COLORS.soft, cx, y);
  }

  y -= GAP_AFTER_LANG + GAP_BEFORE_QR + QR_SIZE;
  const qrBytes = fs.readFileSync(QR_PATH);
  const qrImg   = await doc.embedPng(qrBytes);
  page.drawImage(qrImg, {
    x: cx - QR_SIZE / 2,
    y,
    width: QR_SIZE,
    height: QR_SIZE
  });

  y -= GAP_AFTER_QR;
  drawCenteredText(page, URL_TEXT, helvetica, URL_SIZE, COLORS.soft, cx, y);

  const bytes = await doc.save();
  fs.writeFileSync(OUT_PATH, bytes);

  console.log(`A5 table-tent PDF: ${OUT_PATH}`);
  console.log(`Size: ${(bytes.length / 1024).toFixed(1)} KB`);
  console.log("");
  console.log("Print on cream or white 250-300 gsm cardstock.");
}

function drawCenteredText(page, text, font, size, color, cx, y, spacing = 0) {
  // pdf-lib's widthOfTextAtSize already reports the rendered advance width.
  // Previously we added (N-1)*spacing on top, which over-compensated and
  // shifted long letter-spaced strings visibly left. Using baseWidth directly
  // yields true visual centering. characterSpacing is still applied at render.
  const baseWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: cx - baseWidth / 2,
    y,
    size,
    font,
    color,
    characterSpacing: spacing
  });
}

// A small wave ornament (two gentle arcs), fitting the sea aesthetic
function drawWaveOrnament(page, cx, cy, color) {
  // Flanking lines
  page.drawLine({ start: { x: cx - 70, y: cy }, end: { x: cx - 30, y: cy }, thickness: 0.7, color, opacity: 0.35 });
  page.drawLine({ start: { x: cx + 30, y: cy }, end: { x: cx + 70, y: cy }, thickness: 0.7, color, opacity: 0.35 });
  // Center: 3 wave ellipses for the suggestion of water
  page.drawEllipse({ x: cx - 14, y: cy, xScale: 6, yScale: 1.6, color, opacity: 0.55 });
  page.drawEllipse({ x: cx + 14, y: cy, xScale: 6, yScale: 1.6, color, opacity: 0.55 });
  page.drawEllipse({ x: cx, y: cy + 2, xScale: 3.2, yScale: 1.2, color, opacity: 0.7 });
}

main().catch(err => {
  console.error("Failed to generate PDF:", err);
  process.exit(1);
});
