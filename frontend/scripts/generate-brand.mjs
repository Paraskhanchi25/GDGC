// Canonical geometry lives in public/brand/symbol.svg. Run: node scripts/generate-brand.mjs
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
const source = await readFile(
  new URL("../public/brand/symbol.svg", import.meta.url),
  "utf8",
);
const dir = new URL("../public/brand/", import.meta.url);
await writeFile(
  new URL("monochrome.svg", dir),
  source.replaceAll("#945F40", "#29231F").replaceAll("#89769D", "#29231F"),
);
await writeFile(
  new URL("dark.svg", dir),
  source.replaceAll("#945F40", "#E8CBA8").replaceAll("#89769D", "#EAE3F1"),
);
await writeFile(
  new URL("wordmark.svg", dir),
  source
    .replace('viewBox="0 0 64 64"', 'viewBox="0 0 260 64"')
    .replace(
      "</svg>",
      '<text x="76" y="43" fill="#29231F" font-family="Arial,sans-serif" font-size="32" font-weight="600" letter-spacing="5">PULSE</text></svg>',
    ),
);
for (const size of [16, 32, 48, 180, 192, 512]) {
  const padded = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="14" fill="#F5F1EA"/>${source.replace("<svg ", '<svg x="8" y="8" width="48" height="48" ')}</svg>`;
  await sharp(Buffer.from(padded))
    .resize(size, size)
    .png()
    .toFile(
      new URL(`icon-${size}.png`, dir).pathname.replace(/^\/(\w:)/, "$1"),
    );
}
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#F5F1EA"/>${source.replace("<svg ", '<svg x="90" y="90" width="100" height="100" ')}<g fill="#29231F" font-family="Georgia,serif"><text x="100" y="310" font-size="74">Your money. A clearer picture.</text><text x="100" y="390" font-size="30">Understand your money. Build your financial future.</text><text x="100" y="530" font-family="Arial,sans-serif" font-size="24" letter-spacing="8">PULSE · STUDENT FINANCE</text></g></svg>`;
await sharp(Buffer.from(og))
  .png()
  .toFile(new URL("open-graph.png", dir).pathname.replace(/^\/(\w:)/, "$1"));
