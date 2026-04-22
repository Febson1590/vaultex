#!/usr/bin/env node
/**
 * One-shot icon bake step. Produces the Vaultex-branded raster icons
 * the PWA manifest and legacy browsers need, rendered from the single
 * SVG source of truth (`app/icon.svg`) via sharp.
 *
 * Outputs (under `public/`):
 *   favicon.ico        multi-size ico (.ico) for legacy user agents
 *   icon-192.png       192x192 PNG for the PWA manifest
 *   icon-512.png       512x512 PNG for the PWA manifest
 *   icon-maskable.png  512x512 PNG tagged "maskable" (same art)
 *
 * Run with `node scripts/gen-icons.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(process.cwd());
const src  = fs.readFileSync(path.join(root, "app/icon.svg"));

const pub = path.join(root, "public");
fs.mkdirSync(pub, { recursive: true });

async function png(size, outName) {
  const buf = await sharp(src, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 95, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(pub, outName), buf);
  console.log(`✔ ${outName}  ${buf.length.toLocaleString()} bytes`);
}

// Multi-size PNG stream becomes the .ico. 16/32/48 cover every legacy
// browser chrome we care about.
async function ico() {
  const sizes = [16, 32, 48];
  const buffers = await Promise.all(
    sizes.map((s) =>
      sharp(src, { density: 384 })
        .resize(s, s)
        .png()
        .toBuffer(),
    ),
  );
  // Minimal ICO writer — single PNG-encoded entry is widely supported.
  // For true multi-size .ico we'd need `png-to-ico`; instead we embed
  // the 32px PNG directly, which every major browser accepts as .ico.
  // (Legacy IE is ignored.)
  const entry = buffers[1]; // 32x32
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type = ICO
  icoHeader.writeUInt16LE(1, 4); // count

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = 32;                                // width
  dirEntry[1] = 32;                                // height
  dirEntry[2] = 0;                                 // palette
  dirEntry[3] = 0;                                 // reserved
  dirEntry.writeUInt16LE(1, 4);                    // planes
  dirEntry.writeUInt16LE(32, 6);                   // bpp
  dirEntry.writeUInt32LE(entry.length, 8);         // size
  dirEntry.writeUInt32LE(6 + 16, 12);              // offset

  const out = Buffer.concat([icoHeader, dirEntry, entry]);
  fs.writeFileSync(path.join(pub, "favicon.ico"), out);
  console.log(`✔ favicon.ico  ${out.length.toLocaleString()} bytes`);
}

await png(192, "icon-192.png");
await png(512, "icon-512.png");
await png(512, "icon-maskable.png");
await ico();
console.log("\ndone.");
