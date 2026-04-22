#!/usr/bin/env node
// Generate index.html from data/menu.json + data/site.json.
// Run: node tools/build.js   (or: npm run build)

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const menu = JSON.parse(fs.readFileSync(path.join(ROOT, "data/menu.json"), "utf8"));
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "data/site.json"), "utf8"));

const LANG_CODES = Object.keys(site.languages);
const DEFAULT_LANG = "en";
const R = site.restaurant;

// ───────────────────── build TRANSLATIONS (structural + menu items) ─────────────

const translations = {};
for (const lang of LANG_CODES) {
  const t = { ...site.translations[lang] };
  // Per-category names + each item's name (and optional sub)
  for (const cat of menu.categories) {
    t[`cat_${cat.id}`] = cat.name[lang] || cat.name[DEFAULT_LANG];
    for (const item of cat.items) {
      t[`item_${item.id}`] = item.name[lang] || item.name[DEFAULT_LANG];
      if (item.sub) {
        t[`item_${item.id}_sub`] = item.sub[lang] || item.sub[DEFAULT_LANG];
      }
    }
  }
  translations[lang] = t;
}

const langMeta = {};
for (const lang of LANG_CODES) {
  const l = site.languages[lang];
  langMeta[lang] = { flag: l.flag, short: l.short, html_lang: l.html_lang, label: l.label };
}

// ───────────────────── helpers for rendering HTML ───────────────────────────────

function priceFmt(n) {
  return n.toFixed(2);
}

function menuItemHtml(item) {
  const priceClass = item.price >= 50 ? "price price--kg" : "price";
  const subHtml = item.sub
    ? `<span class="el" data-i18n="item_${item.id}_sub">${escape(item.sub[DEFAULT_LANG])}</span>`
    : "";
  return `
          <div class="menu-item${item.featured ? " menu-item--feat" : ""}">
            <div class="name">
              <span data-i18n="item_${item.id}">${escape(item.name[DEFAULT_LANG])}</span>
              ${subHtml}
            </div>
            <div class="${priceClass}">${priceFmt(item.price)}</div>
          </div>`;
}

function menuCategoryHtml(cat) {
  const isKilo = cat.id === "seafood_kilo";
  const extraClass = isKilo ? " menu-section--kilo" : "";
  const kiloBanner = isKilo
    ? `<p class="kilo-note" data-i18n="kilo_banner">Priced per kilo · the catch is weighed in front of you</p>`
    : "";
  // wide category?  drinks, wines, coffee span full width on desktop
  const isWide = cat.id === "drinks" || cat.id === "wines" || cat.id === "coffee" || cat.id === "extras";
  const gridStyle = isWide ? ` style="grid-column: 1 / -1;"` : "";

  return `
      <div class="menu-section reveal${extraClass}"${gridStyle}>
        <h3><span data-i18n="cat_${cat.id}">${escape(cat.name[DEFAULT_LANG])}</span> <span class="gr">· ${escape(menu.categories.find(c => c.id === cat.id).name.el)}</span></h3>
        ${kiloBanner}
        <div class="menu-items${isWide && cat.id !== "extras" ? " menu-items--two-col" : ""}">
          ${cat.items.map(menuItemHtml).join("")}
        </div>
      </div>`;
}

function escape(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function langMenuHtml() {
  return LANG_CODES.map(code => {
    const l = site.languages[code];
    return `<li data-lang="${code}"><span class="flag">${l.flag}</span><span>${l.label}</span></li>`;
  }).join("\n          ");
}

// ───────────────────── the HTML template ────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en" id="htmlroot">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title data-i18n="meta_title">${escape(site.translations.en.meta_title)}</title>
<meta name="description" data-i18n-attr="content:meta_desc" content="${escape(site.translations.en.meta_desc)}" />

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@300;400;500;600&family=Caveat:wght@400;600&display=swap" rel="stylesheet">

<style>
  :root {
    --ink: #0c2235;
    --ink-soft: #3b556e;
    --paper: #f0e8d6;
    --paper-deep: #e1d6bd;
    --cream: #faf5e8;
    --sea: #1b5a87;
    --sea-deep: #0e3d63;
    --sea-ink: #062238;
    --gold: #c29a3a;
    --coral: #c95b3a;
    --seafoam: #5a8c86;
    --rule: rgba(12, 34, 53, 0.18);
    --rule-soft: rgba(12, 34, 53, 0.08);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 400;
    color: var(--ink);
    background: var(--paper);
    line-height: 1.55;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* paper grain overlay */
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: 0.32;
    mix-blend-mode: multiply;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.08  0 0 0 0 0.12  0 0 0 0 0.18  0 0 0 0.16 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  }

  h1, h2, h3, h4, .serif { font-family: 'Fraunces', Georgia, serif; font-weight: 500; letter-spacing: -0.01em; }
  a { color: inherit; text-decoration: none; }
  .script { font-family: 'Caveat', cursive; font-weight: 600; }
  .container { width: min(1200px, 92vw); margin: 0 auto; position: relative; z-index: 2; }

  /* ===== Language switcher ===== */
  .nav-right { display: flex; align-items: center; gap: 16px; }
  .lang-switcher { position: relative; }
  .lang-current {
    display: inline-flex; align-items: center; gap: 8px;
    background: transparent; border: 1px solid var(--rule);
    color: var(--ink); padding: 8px 14px; border-radius: 999px;
    font-size: 12px; font-weight: 500; letter-spacing: 0.08em;
    cursor: pointer; font-family: inherit;
    transition: border-color 0.2s, background 0.2s;
  }
  .lang-current:hover { border-color: var(--sea); }
  .lang-current .flag { font-size: 16px; line-height: 1; }
  .lang-menu {
    position: absolute; top: calc(100% + 8px); right: 0;
    min-width: 180px; background: var(--cream);
    border: 1px solid var(--rule); border-radius: 6px;
    box-shadow: 0 15px 40px rgba(12, 34, 53, 0.12);
    list-style: none; padding: 6px; margin: 0;
    opacity: 0; visibility: hidden; transform: translateY(-4px);
    transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
    z-index: 100;
  }
  .lang-menu.open { opacity: 1; visibility: visible; transform: translateY(0); }
  .lang-menu li {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; font-size: 14px; border-radius: 4px;
    cursor: pointer; font-family: 'Fraunces', serif;
    transition: background 0.15s;
  }
  .lang-menu li:hover { background: var(--paper-deep); }
  .lang-menu li.active { background: var(--paper-deep); color: var(--sea-deep); }
  .lang-menu li .flag { font-size: 18px; line-height: 1; }

  @media (max-width: 768px) {
    .nav-cta { display: none; }
    .lang-current { padding: 7px 12px; }
  }

  /* ===== Nav ===== */
  .nav {
    position: sticky; top: 0; z-index: 50;
    background: rgba(240, 232, 214, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--rule-soft);
  }
  .nav-inner { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; }
  .brand { display: flex; align-items: center; gap: 12px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 20px; letter-spacing: 0.02em; }
  .brand-mark {
    width: 42px; height: 42px;
    display: grid; place-items: center;
    background: var(--sea); color: var(--cream);
    border-radius: 50%;
    font-family: 'Fraunces', serif; font-weight: 700;
    font-size: 15px; letter-spacing: -0.02em;
  }
  .nav-links {
    display: flex; gap: 34px;
    font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .nav-links a { position: relative; padding: 4px 0; transition: color 0.25s; }
  .nav-links a::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: -2px;
    height: 1px; background: var(--sea);
    transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease;
  }
  .nav-links a:hover::after { transform: scaleX(1); }
  .nav-cta {
    background: var(--ink); color: var(--cream);
    padding: 10px 20px; border-radius: 999px;
    font-size: 13px; font-weight: 500; letter-spacing: 0.04em;
    transition: background 0.25s;
  }
  .nav-cta:hover { background: var(--sea); }

  @media (max-width: 768px) { .nav-links { display: none; } }

  /* ===== Hero ===== */
  .hero { position: relative; padding: 80px 0 110px; overflow: hidden; }
  .hero-grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 64px; align-items: center; }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 12px;
    font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--sea-deep); font-weight: 500; margin-bottom: 28px;
  }
  .hero-eyebrow::before { content: ""; width: 38px; height: 1px; background: var(--sea-deep); }
  .hero h1 {
    font-size: clamp(42px, 6.2vw, 82px);
    line-height: 0.98; letter-spacing: -0.03em;
    font-weight: 500; color: var(--ink); margin-bottom: 28px;
  }
  .hero h1 .accent { font-style: italic; font-weight: 400; color: var(--sea-deep); }
  .hero h1 .swash {
    font-family: 'Caveat', cursive; font-weight: 600;
    color: var(--gold); font-size: 0.65em;
    vertical-align: middle; display: inline-block;
    transform: translateY(-0.15em) rotate(-4deg); margin: 0 0.1em;
  }
  .hero-lede { font-size: 18px; max-width: 46ch; color: var(--ink-soft); margin-bottom: 38px; line-height: 1.6; }
  .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
  .btn {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 15px 28px; font-size: 14px; letter-spacing: 0.04em; font-weight: 500;
    border-radius: 999px; transition: transform 0.25s, background 0.25s, color 0.25s; cursor: pointer;
  }
  .btn-primary { background: var(--sea); color: var(--cream); }
  .btn-primary:hover { background: var(--sea-deep); transform: translateY(-2px); }
  .btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--ink); }
  .btn-ghost:hover { background: var(--ink); color: var(--cream); transform: translateY(-2px); }
  .btn .arrow { transition: transform 0.25s; }
  .btn:hover .arrow { transform: translateX(4px); }

  .hero-art {
    position: relative; width: 100%; max-width: 560px; margin-left: auto;
    border-radius: 2px; overflow: hidden;
    box-shadow: 0 30px 60px -20px rgba(6, 34, 56, 0.4), 0 15px 30px -15px rgba(6, 34, 56, 0.3);
    transform: rotate(-0.6deg);
    transition: transform 0.6s ease;
  }
  .hero-art:hover { transform: rotate(0) translateY(-4px); }
  .hero-art img { display: block; width: 100%; height: auto; }

  .hero-art-placeholder {
    aspect-ratio: 4 / 5;
    background:
      linear-gradient(160deg, var(--sea-deep) 0%, var(--sea) 45%, var(--seafoam) 100%);
    display: grid; place-items: center;
    color: var(--cream);
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: clamp(28px, 3.6vw, 42px);
    text-align: center; padding: 40px;
    line-height: 1.15;
  }
  .hero-art-placeholder::after {
    content: "${R.established}";
    position: absolute; bottom: 24px; right: 28px;
    font-family: 'Caveat', cursive; color: var(--gold); font-size: 24px;
    transform: rotate(-4deg);
  }

  .hero-strip {
    display: flex; align-items: center; gap: 30px;
    margin-top: 70px; padding-top: 30px;
    border-top: 1px solid var(--rule-soft);
    font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--ink-soft); flex-wrap: wrap;
  }
  .hero-strip .dot { color: var(--sea); }

  @media (max-width: 900px) {
    .hero { padding: 50px 0 70px; }
    .hero-grid { grid-template-columns: 1fr; gap: 50px; }
    .hero-art { max-width: 460px; margin: 0 auto; }
  }

  /* ===== Marquee ===== */
  .marquee {
    background: var(--sea-ink); color: var(--cream);
    padding: 18px 0; overflow: hidden;
    border-top: 1px solid var(--sea-deep);
    border-bottom: 1px solid var(--sea-deep);
  }
  .marquee-track {
    display: flex; gap: 60px;
    animation: scroll 42s linear infinite; white-space: nowrap;
  }
  .marquee-item {
    font-family: 'Fraunces', serif; font-style: italic;
    font-size: 22px; letter-spacing: 0.02em;
    display: flex; align-items: center; gap: 60px;
  }
  .marquee-item::after { content: "✦"; color: var(--gold); font-style: normal; }
  @keyframes scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  /* ===== Story ===== */
  .story { padding: 130px 0 120px; position: relative; }
  .story-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 80px; align-items: start; }
  .section-eyebrow {
    font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase;
    color: var(--sea-deep); font-weight: 500; margin-bottom: 18px;
    display: flex; align-items: center; gap: 14px;
  }
  .section-eyebrow::before { content: ""; width: 30px; height: 1px; background: var(--sea-deep); }
  .story h2 { font-size: clamp(36px, 4.5vw, 58px); line-height: 1.02; letter-spacing: -0.02em; font-weight: 500; margin-bottom: 24px; }
  .story h2 em { font-style: italic; color: var(--sea-deep); }
  .story p { font-size: 17px; color: var(--ink-soft); margin-bottom: 20px; line-height: 1.7; }
  .story p:first-of-type::first-letter {
    font-family: 'Fraunces', serif; font-size: 68px; font-weight: 600; font-style: italic;
    float: left; line-height: 0.85; margin: 8px 12px 0 0; color: var(--sea);
  }
  .story-facts {
    margin-top: 36px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 24px 36px;
    padding-top: 32px; border-top: 1px solid var(--rule);
  }
  .fact .num {
    font-family: 'Fraunces', serif; font-size: 44px; font-weight: 500;
    color: var(--seafoam); line-height: 1; display: block;
  }
  .fact .lbl { font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-soft); margin-top: 6px; }

  @media (max-width: 900px) {
    .story { padding: 80px 0; }
    .story-grid { grid-template-columns: 1fr; gap: 40px; }
  }

  /* ===== Signature ===== */
  .signature {
    background: var(--sea-ink); color: var(--cream);
    padding: 120px 0; position: relative; overflow: hidden;
  }
  .signature::before {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(circle at 85% 20%, rgba(194, 154, 58, 0.22), transparent 55%),
      radial-gradient(circle at 10% 80%, rgba(90, 140, 134, 0.25), transparent 55%);
  }
  .signature .container { position: relative; z-index: 2; }
  .signature h2 {
    font-size: clamp(40px, 6vw, 78px); line-height: 1; letter-spacing: -0.02em;
    font-weight: 400; margin-bottom: 16px;
  }
  .signature h2 em { font-style: italic; color: var(--gold); }
  .signature .sub {
    font-family: 'Caveat', cursive; font-size: 28px; color: var(--gold);
    margin-bottom: 50px; display: inline-block; transform: rotate(-2deg);
  }
  .trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; margin-top: 60px; }
  .trio-card { position: relative; padding-top: 28px; }
  .trio-num {
    font-family: 'Fraunces', serif; font-size: 84px; font-weight: 400; font-style: italic;
    color: var(--gold); line-height: 0.8; display: block; opacity: 0.9;
  }
  .trio-card h3 { font-size: 28px; margin: 18px 0 10px; font-weight: 500; }
  .trio-card .gr {
    font-family: 'Fraunces', serif; font-style: italic; color: var(--seafoam);
    font-size: 17px; display: block; margin-bottom: 14px;
  }
  .trio-card p { color: rgba(250, 245, 232, 0.78); font-size: 15px; line-height: 1.7; }

  @media (max-width: 900px) {
    .signature { padding: 80px 0; }
    .trio { grid-template-columns: 1fr; gap: 40px; }
  }

  /* ===== Menu ===== */
  .menu { padding: 130px 0; background: var(--paper); }
  .menu-header { text-align: center; margin-bottom: 80px; }
  .menu-header h2 {
    font-size: clamp(42px, 5vw, 68px); line-height: 1; letter-spacing: -0.02em;
    font-weight: 500; margin-bottom: 16px;
  }
  .menu-header h2 em { font-style: italic; color: var(--sea-deep); }
  .menu-header p {
    font-family: 'Fraunces', serif; font-style: italic; font-size: 18px;
    color: var(--ink-soft); max-width: 56ch; margin: 0 auto;
  }
  .menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 72px 80px; }
  .menu-section h3 {
    font-size: 26px; font-weight: 500; margin-bottom: 6px;
    display: flex; align-items: baseline; gap: 14px;
  }
  .menu-section h3 .gr {
    font-family: 'Fraunces', serif; font-style: italic; font-weight: 400;
    color: var(--sea-deep); font-size: 20px;
  }
  .menu-items { margin-top: 22px; }
  .menu-items--two-col { display: grid; grid-template-columns: 1fr 1fr; column-gap: 60px; }
  .menu-item {
    display: grid; grid-template-columns: 1fr auto;
    align-items: baseline; padding: 12px 0;
    border-bottom: 1px dotted var(--rule); gap: 16px;
  }
  .menu-item:last-child { border-bottom: none; }
  .menu-item .name {
    font-family: 'Fraunces', serif; font-size: 17px; font-weight: 500;
    color: var(--ink); line-height: 1.25;
  }
  .menu-item .name .el {
    display: block; font-size: 13px; font-style: italic; font-weight: 400;
    color: var(--ink-soft); margin-top: 3px; line-height: 1.45;
  }
  .menu-item .price {
    font-family: 'Fraunces', serif; font-size: 17px; font-weight: 500;
    color: var(--sea-deep); font-variant-numeric: tabular-nums;
  }
  .menu-item .price::before {
    content: "${menu.currency}"; font-size: 13px; margin-right: 2px; opacity: 0.7;
  }
  .menu-item .price--kg::after {
    content: " / kg"; font-size: 11px; color: var(--ink-soft); font-style: italic; font-weight: 400;
  }
  .menu-item--feat {
    background: var(--cream);
    border: 1px solid var(--rule); border-radius: 4px;
    padding: 14px 16px; margin: 8px 0;
  }
  .menu-item--feat .name { color: var(--sea-deep); }

  /* featured Tripleta-style block */
  .featured {
    grid-column: 1 / -1;
    background: var(--cream);
    padding: 36px 40px; border: 1px solid var(--rule);
    display: flex; justify-content: space-between; align-items: center;
    gap: 30px; position: relative;
  }
  .featured::before {
    content: "ΣΗΜΑ ΚΑΤΑΤΕΘΕΝ";
    position: absolute; top: -11px; left: 30px;
    background: var(--paper); padding: 0 12px;
    font-size: 10px; letter-spacing: 0.28em; color: var(--sea-deep);
  }
  .featured h4 { font-size: 26px; font-weight: 500; margin-bottom: 6px; }
  .featured h4 em { font-style: italic; color: var(--sea-deep); }
  .featured p { font-size: 14px; color: var(--ink-soft); max-width: 60ch; }
  .featured .price-block { text-align: right; flex-shrink: 0; }
  .featured .price-block .amt {
    font-family: 'Fraunces', serif; font-size: 42px; font-weight: 500;
    color: var(--sea-deep); line-height: 1;
  }
  .featured .price-block .amt::before {
    content: "${menu.currency}"; font-size: 22px; vertical-align: top; margin-right: 2px; opacity: 0.75;
  }
  .featured .price-block .lbl {
    font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--ink-soft); margin-top: 4px;
  }

  /* kilo banner */
  .menu-section--kilo { grid-column: 1 / -1; }
  .menu-section--kilo .menu-items { display: grid; grid-template-columns: 1fr 1fr; column-gap: 60px; }
  .kilo-note {
    font-family: 'Caveat', cursive; color: var(--gold); font-size: 20px;
    margin: 2px 0 14px; display: block;
  }

  @media (max-width: 900px) {
    .menu { padding: 80px 0; }
    .menu-grid { grid-template-columns: 1fr; gap: 50px; }
    .menu-section--kilo .menu-items { grid-template-columns: 1fr; }
    .menu-items--two-col { grid-template-columns: 1fr; }
    .featured { flex-direction: column; align-items: flex-start; padding: 28px; }
    .featured .price-block { text-align: left; }
  }

  /* ===== Visit ===== */
  .visit {
    background: var(--sea-deep); color: var(--cream);
    padding: 120px 0; position: relative; overflow: hidden;
  }
  .visit::before {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(circle at 15% 20%, rgba(194, 154, 58, 0.15), transparent 45%),
      radial-gradient(circle at 90% 90%, rgba(90, 140, 134, 0.18), transparent 50%);
  }
  .visit .container { position: relative; z-index: 2; }
  .visit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; }
  .visit h2 {
    font-size: clamp(40px, 5vw, 64px); line-height: 1; letter-spacing: -0.02em;
    font-weight: 400; margin-bottom: 22px;
  }
  .visit h2 em { font-style: italic; color: var(--gold); }
  .visit-intro {
    font-size: 18px; color: rgba(250, 245, 232, 0.82);
    line-height: 1.65; margin-bottom: 38px; max-width: 42ch;
  }
  .info-block { padding: 22px 0; border-top: 1px solid rgba(250, 245, 232, 0.18); }
  .info-block:last-child { border-bottom: 1px solid rgba(250, 245, 232, 0.18); }
  .info-block .lbl { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; }
  .info-block .val { font-family: 'Fraunces', serif; font-size: 20px; line-height: 1.35; }
  .info-block .val a:hover { color: var(--gold); }
  .info-block .sub { font-size: 14px; color: rgba(250, 245, 232, 0.65); margin-top: 4px; }
  .hours-table { width: 100%; border-collapse: collapse; }
  .hours-table td {
    padding: 10px 0; font-size: 15px;
    border-bottom: 1px solid rgba(250, 245, 232, 0.12);
    font-family: 'Fraunces', serif;
  }
  .hours-table td:first-child { color: rgba(250, 245, 232, 0.7); font-style: italic; }
  .hours-table td:last-child { text-align: right; font-weight: 500; }
  .hours-table tr:last-child td { border-bottom: none; }

  @media (max-width: 900px) {
    .visit { padding: 80px 0; }
    .visit-grid { grid-template-columns: 1fr; gap: 50px; }
  }

  /* ===== Footer ===== */
  footer { background: var(--sea-ink); color: rgba(250, 245, 232, 0.7); padding: 60px 0 40px; }
  .foot { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
  .foot .brand { color: var(--cream); }
  .foot-note { font-size: 13px; font-family: 'Fraunces', serif; font-style: italic; }
  .foot-links { display: flex; gap: 24px; font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; }
  .foot-links a:hover { color: var(--gold); }

  /* reveal on scroll */
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.8s ease, transform 0.8s ease; }
  .reveal.in { opacity: 1; transform: translateY(0); }
</style>
</head>
<body>

<!-- ========= NAV ========= -->
<nav class="nav">
  <div class="container nav-inner">
    <a class="brand" href="#top">
      <span class="brand-mark">${R.brand_mark}</span>
      <span>${escape(R.name_greek)}</span>
    </a>
    <div class="nav-links">
      <a href="#story" data-i18n="nav_story">Our Story</a>
      <a href="#signature" data-i18n="nav_signature">The Octopus</a>
      <a href="#menu" data-i18n="nav_menu">Menu</a>
      <a href="#visit" data-i18n="nav_visit">Visit</a>
    </div>
    <div class="nav-right">
      <div class="lang-switcher">
        <button class="lang-current" id="langButton" aria-haspopup="true" aria-expanded="false">
          <span class="flag" id="langCurrentFlag">🇬🇧</span>
          <span id="langCurrentLabel">EN</span>
          <span aria-hidden="true">▾</span>
        </button>
        <ul class="lang-menu" id="langMenu">
          ${langMenuHtml()}
        </ul>
      </div>
      <a class="nav-cta" href="#visit" data-i18n="nav_cta">Find Us</a>
    </div>
  </div>
</nav>

<!-- ========= HERO ========= -->
<section class="hero" id="top">
  <div class="container">
    <div class="hero-grid">
      <div>
        <span class="hero-eyebrow" data-i18n="hero_eyebrow">90 Moires · Gythio · Mani · since 1959</span>
        <h1 data-i18n-html="hero_title_html">${site.translations.en.hero_title_html}</h1>
        <p class="hero-lede" data-i18n="hero_lede">${escape(site.translations.en.hero_lede)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#menu"><span data-i18n="hero_btn_menu">See the Menu</span> <span class="arrow">→</span></a>
          <a class="btn btn-ghost" href="#story" data-i18n="hero_btn_story">What's 90 Moires?</a>
        </div>
      </div>
      <div class="hero-art reveal">
        <img src="${R.hero_image}" alt="Taverna 90 Moires" onerror="this.outerHTML='<div class=&quot;hero-art-placeholder&quot;><div>Χταπόδι<br/><em>on charcoal</em></div></div>'"/>
      </div>
    </div>
    <div class="hero-strip">
      <span class="dot">●</span> <span data-i18n="strip_1">Daily catch</span>
      <span class="dot">●</span> <span data-i18n="strip_2">Laconian olive oil</span>
      <span class="dot">●</span> <span data-i18n="strip_3">House wine from the barrel</span>
      <span class="dot">●</span> <span data-i18n="strip_4">Family recipes since 1959</span>
    </div>
  </div>
</section>

<!-- ========= MARQUEE ========= -->
<div class="marquee">
  <div class="marquee-track">
    <div class="marquee-item">Ψάρι · Χταπόδι · Καλαμάρι · Γαρίδες · Μπαρμπούνι · Μελιτζάνα · Φέτα · Ούζο</div>
    <div class="marquee-item">Ψάρι · Χταπόδι · Καλαμάρι · Γαρίδες · Μπαρμπούνι · Μελιτζάνα · Φέτα · Ούζο</div>
  </div>
</div>

<!-- ========= STORY ========= -->
<section class="story" id="story">
  <div class="container">
    <div class="story-grid">
      <div class="reveal">
        <span class="section-eyebrow" data-i18n="story_eyebrow">Our Story</span>
        <h2 data-i18n-html="story_title_html">${site.translations.en.story_title_html}</h2>
      </div>
      <div class="reveal">
        <p data-i18n="story_p1">${escape(site.translations.en.story_p1)}</p>
        <p data-i18n="story_p2">${escape(site.translations.en.story_p2)}</p>
        <p data-i18n="story_p3">${escape(site.translations.en.story_p3)}</p>
        <div class="story-facts">
          <div class="fact">
            <span class="num" data-i18n="fact_1_num">65+</span>
            <span class="lbl" data-i18n="fact_1_lbl">years at the same corner</span>
          </div>
          <div class="fact">
            <span class="num" data-i18n="fact_2_num">3</span>
            <span class="lbl" data-i18n="fact_2_lbl">generations of cooks</span>
          </div>
          <div class="fact">
            <span class="num" data-i18n="fact_3_num">12+</span>
            <span class="lbl" data-i18n="fact_3_lbl">kinds of fresh fish by the kilo</span>
          </div>
          <div class="fact">
            <span class="num" data-i18n="fact_4_num">90°</span>
            <span class="lbl" data-i18n="fact_4_lbl">east by dawn, every morning</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ========= SIGNATURE ========= -->
<section class="signature" id="signature">
  <div class="container reveal">
    <span class="section-eyebrow" style="color: var(--gold);" data-i18n="sig_eyebrow">Σήμα Κατατεθέν · The Signature</span>
    <h2 data-i18n-html="sig_title_html">${site.translations.en.sig_title_html}</h2>
    <span class="sub" data-i18n="sig_sub">${escape(site.translations.en.sig_sub)}</span>
    <p style="max-width: 52ch; color: rgba(250,245,232,0.82); line-height: 1.7; font-size: 17px;" data-i18n="sig_intro">${escape(site.translations.en.sig_intro)}</p>

    <div class="trio">
      <div class="trio-card reveal">
        <span class="trio-num">i.</span>
        <h3 data-i18n="trio_1_title">The Catch</h3>
        <span class="gr" data-i18n="trio_1_gr">Από τη θάλασσα</span>
        <p data-i18n="trio_1_desc">${escape(site.translations.en.trio_1_desc)}</p>
      </div>
      <div class="trio-card reveal">
        <span class="trio-num">ii.</span>
        <h3 data-i18n="trio_2_title">The Fire</h3>
        <span class="gr" data-i18n="trio_2_gr">Στα κάρβουνα</span>
        <p data-i18n="trio_2_desc">${escape(site.translations.en.trio_2_desc)}</p>
      </div>
      <div class="trio-card reveal">
        <span class="trio-num">iii.</span>
        <h3 data-i18n="trio_3_title">The Table</h3>
        <span class="gr" data-i18n="trio_3_gr">Στο τραπέζι</span>
        <p data-i18n="trio_3_desc">${escape(site.translations.en.trio_3_desc)}</p>
      </div>
    </div>
  </div>
</section>

<!-- ========= MENU ========= -->
<section class="menu" id="menu">
  <div class="container">
    <div class="menu-header reveal">
      <span class="section-eyebrow" style="justify-content: center;" data-i18n="menu_eyebrow">${escape(site.translations.en.menu_eyebrow)}</span>
      <h2 data-i18n-html="menu_title_html">${site.translations.en.menu_title_html}</h2>
      <p data-i18n="menu_intro">${escape(site.translations.en.menu_intro)}</p>
    </div>

    <div class="menu-grid">

      <!-- Featured: Grilled Octopus -->
      <div class="featured reveal">
        <div>
          <h4 data-i18n-html="feat_title_html">${site.translations.en.feat_title_html}</h4>
          <p style="font-family: 'Fraunces', serif; font-style: italic; color: var(--sea-deep); margin: 4px 0 8px;" data-i18n="feat_sub">${escape(site.translations.en.feat_sub)}</p>
          <p data-i18n="feat_desc">${escape(site.translations.en.feat_desc)}</p>
        </div>
        <div class="price-block">
          <div class="amt">17.00</div>
          <div class="lbl" data-i18n="feat_label">the whole reason</div>
        </div>
      </div>
${menu.categories.map(menuCategoryHtml).join("")}

    </div>
  </div>
</section>

<!-- ========= VISIT ========= -->
<section class="visit" id="visit">
  <div class="container visit-grid">
    <div class="reveal">
      <span class="section-eyebrow" style="color: var(--gold);" data-i18n="visit_eyebrow">Visit Us</span>
      <h2 data-i18n-html="visit_title_html">${site.translations.en.visit_title_html}</h2>
      <p class="visit-intro" data-i18n="visit_intro">${escape(site.translations.en.visit_intro)}</p>
      <a class="btn btn-primary" href="${R.maps_url}" target="_blank" rel="noopener" style="background: var(--gold); color: var(--sea-ink);"><span data-i18n="visit_btn">Open in Google Maps</span> <span class="arrow">→</span></a>
    </div>

    <div class="reveal">
      <div class="info-block">
        <div class="lbl" data-i18n="visit_where_lbl">Where</div>
        <div class="val">${escape(R.location_greek)}<br/>Γύθειο · Gythio 232 00</div>
        <div class="sub" data-i18n="visit_where_sub">Laconia · Mani · Peloponnese</div>
      </div>

      <div class="info-block">
        <div class="lbl" data-i18n="visit_phone_lbl">Phone</div>
        <div class="val"><a href="${R.phone_tel}">${escape(R.phone)}</a></div>
        <div class="sub" data-i18n="visit_phone_sub">call ahead for larger groups or whole fish</div>
      </div>

      <div class="info-block">
        <div class="lbl" data-i18n="visit_hours_lbl">Hours</div>
        <table class="hours-table" style="margin-top: 6px;">
          <tr><td data-i18n="day_every">Every day</td><td>10:00 – 23:30</td></tr>
        </table>
        <div class="sub" style="margin-top: 8px;" data-i18n="visit_hours_note">every day, lunch and dinner</div>
      </div>

      <div class="info-block">
        <div class="lbl" data-i18n="visit_find_lbl">Find us</div>
        <div class="val">
          <a href="${R.maps_url}" target="_blank" rel="noopener">Google Maps</a> &nbsp;·&nbsp;
          <a href="${R.instagram_url}" target="_blank" rel="noopener">Instagram</a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ========= FOOTER ========= -->
<footer>
  <div class="container foot">
    <a class="brand" href="#top">
      <span class="brand-mark">${R.brand_mark}</span>
      <span>${escape(R.name_greek)} · Gythio</span>
    </a>
    <div class="foot-note" data-i18n="foot_tagline">${escape(site.translations.en.foot_tagline)}</div>
    <div class="foot-links">
      <a href="#menu" data-i18n="foot_menu">Menu</a>
      <a href="#visit" data-i18n="foot_visit">Visit</a>
      <a href="#" data-i18n="foot_privacy">Privacy</a>
    </div>
  </div>
  <div class="container" style="text-align: center; margin-top: 30px; font-size: 12px; opacity: 0.55; letter-spacing: 0.1em;">
    © <span id="yr"></span> · <span data-i18n="foot_copyright">${escape(site.translations.en.foot_copyright)}</span>
  </div>
</footer>

<script>
  document.getElementById('yr').textContent = new Date().getFullYear();

  const TRANSLATIONS = ${JSON.stringify(translations)};
  const LANG_META = ${JSON.stringify(langMeta)};
  const SUPPORTED = Object.keys(TRANSLATIONS);

  function detectInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('lang');
    if (q && SUPPORTED.includes(q)) return q;
    const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    const base = nav.split('-')[0];
    if (SUPPORTED.includes(base)) return base;
    return 'en';
  }

  function renderI18n(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      const [attr, key] = spec.split(':');
      if (attr && key && dict[key] !== undefined) el.setAttribute(attr, dict[key]);
    });

    const meta = LANG_META[lang];
    if (meta) {
      document.getElementById('langCurrentFlag').textContent = meta.flag;
      document.getElementById('langCurrentLabel').textContent = meta.short;
      document.getElementById('htmlroot').setAttribute('lang', meta.html_lang);
    }
    document.querySelectorAll('.lang-menu li').forEach(li => {
      li.classList.toggle('active', li.getAttribute('data-lang') === lang);
    });

    const url = new URL(window.location);
    if (lang !== 'en') url.searchParams.set('lang', lang);
    else url.searchParams.delete('lang');
    window.history.replaceState({}, '', url);
  }

  (function setupLanguageSwitcher() {
    const btn = document.getElementById('langButton');
    const menu = document.getElementById('langMenu');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', e => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    menu.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        renderI18n(li.getAttribute('data-lang'));
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  })();

  renderI18n(detectInitialLang());

  // reveal on scroll
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, "index.html"), HTML);
console.log(`index.html written: ${(HTML.length / 1024).toFixed(1)} KB`);
console.log(`Languages: ${LANG_CODES.join(", ")}`);
console.log(`Categories: ${menu.categories.length}, items: ${menu.categories.reduce((n, c) => n + c.items.length, 0)}`);
console.log(`Keys per language: ${Object.keys(translations.en).length}`);
