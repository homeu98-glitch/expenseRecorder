// 逐 section 截圖（QA 用）：node tools/_shot-sections.mjs <path> <name>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/surface/.workbuddy-ai/binaries/node/workspace/package.json");
const puppeteer = require("puppeteer-core");

const routePath = process.argv[2] || "/homepage";
const name = process.argv[3] || "home";
const width = Number(process.argv[4] || 1440);
const OUT = path.resolve("docs/site-v2-2026-10-26/qa");
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
await page.goto(`http://localhost:3055${routePath}`, { waitUntil: "networkidle2" });
await new Promise((r) => setTimeout(r, 600));

await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
  }
  window.scrollTo(0, 0);
  document.querySelectorAll("[data-rv]").forEach((el) => {
    el.classList.add("s-rv", "is-in");
    el.style.transition = "none";
    el.style.opacity = "1";
    el.style.transform = "none";
  });
  document.querySelectorAll(".s-marquee").forEach((el) => (el.style.animation = "none"));
  const st = document.createElement("style");
  st.textContent = "nextjs-portal{display:none!important}";
  document.head.appendChild(st);
});
await new Promise((r) => setTimeout(r, 500));

const handles = await page.$$(".s-root section");
let i = 0;
for (const h of handles) {
  const box = await h.boundingBox();
  if (!box || box.height < 40) continue;
  i += 1;
  const file = path.join(OUT, `${name}-${String(i).padStart(2, "0")}.png`);
  await h.screenshot({ path: file });
  console.log(`${file}  ${Math.round(box.width)}x${Math.round(box.height)}`);
}

await browser.close();
