# Ταβέρνα 90 Μοίρες — Website

Single-page marketing website for the Gythio fish taverna, since 1959. Data-driven (edit JSON, rebuild) with 7 languages inline: English · Ελληνικά · Deutsch · Français · Español · Italiano · Português.

## Project structure

```
data/
  menu.json          Items, prices, categories (edit to change prices)
  site.json          All non-menu copy — hero, story, visit, translations
index.html           GENERATED — do not edit by hand
images/
  hero.jpg           Optional hero photo (falls back to a placeholder)
tools/
  build.js           Regenerates index.html from data/*.json
  generate-qr.js     QR-code generator
  optimize-images.js Resize/compress images in images/
  make-tent.js       A5 table-tent PDF generator
  package.json       Dev dependencies
vercel.json          Deploy config
```

## Deploy to Vercel

```
npm i -g vercel
vercel --prod
```

Or connect the repo on vercel.com/new and Vercel auto-deploys on every git push.

## Editing content

### Change a price or add/remove a menu item

Edit [`data/menu.json`](data/menu.json), then rebuild:

```
cd tools
npm install   # first time only
npm run build
```

This regenerates `index.html`. Commit and push both the JSON and the HTML.

### Change the story / tagline / hero copy

Edit [`data/site.json`](data/site.json) under `translations.<lang>` (every language shares the same key set). Rebuild with `npm run build`.

### Change the restaurant name / address / phone / hours

Edit the `restaurant` object at the top of [`data/site.json`](data/site.json). Hours are in `index.html` for now (single-row table) — edit directly if they change.

### Change the hero photo

Drop a JPG into `images/hero.jpg` (landscape orientation preferred, ~1200×800, under 200 KB). If no image exists, the site falls back to a typography placeholder that looks fine on its own.

To auto-optimize photos you add:

```
cd tools
npm run optimize
```

### Add or translate a new language

1. In `data/site.json`, add `"xx": { "flag": "🏳️", "short": "XX", "html_lang": "xx", "label": "..." }` under `languages`
2. Add a matching `"xx": { ... }` block under `translations` with every key translated
3. In `data/menu.json`, add `"xx": "..."` to every category name and item name
4. `npm run build`

The language switcher auto-picks up new entries.

## Tools

### QR code

Generate a QR that lands on the menu (pass `?lang=el` to open in Greek by default):

```
cd tools
npm run qr -- "https://your-url.vercel.app/?lang=el"
```

Outputs `qr/menu-qr.png` and `qr/menu-qr.svg`.

### A5 table-tent PDF

After generating a QR:

```
MENU_URL="your-url.vercel.app/?lang=el" npm run tent
```

Outputs `qr/menu-tent-a5.pdf` — print-ready card with brand, location, "SCAN FOR MENU" in 6 languages, the QR, and a small wave ornament matching the sea palette.

## Known placeholders to finalize

- **Hero photo** — drop a file at `images/hero.jpg` or keep the typography placeholder
- **Favicon** — no favicon set; browser shows the default globe
- **OpenGraph tags** — no social-share preview metadata (add if sharing on WhatsApp / Messenger matters)
- **Privacy link** in footer → `href="#"` (add a privacy page or remove)

## Design notes

- **Palette** — deep sea navy + cream paper + gold (Laconian sun) + seafoam accent. No terracotta — that's the Souvlaki project's identity.
- **Signature** — "Grilled Octopus (Χταπόδι ψητό)" is featured in the menu and in the dedicated Signature section. The octopus is the hook; everything else supports it.
- **Seafood by the kilo** — shown as its own category with a gold "priced per kilo" note. This is unusual on the Greek taverna scene and worth featuring prominently.
