// 官網 v2 實機截圖：node tools/_shot-site.mjs [desktop|mobile|all]
// 輸出：docs/site-v3-2026-10-26/
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/surface/.workbuddy-ai/binaries/node/workspace/package.json");
const puppeteer = require("puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3055";
const OUT = path.resolve("docs/site-v3-2026-10-26");

const PAGES = [
  { name: "01-home", path: "/homepage" },
  { name: "02-pos", path: "/homepage/pos" },
  { name: "03-ledger", path: "/homepage/ledger" },
  { name: "04-merchants", path: "/homepage/merchants" },
  { name: "05-pricing", path: "/homepage/pricing" },
  { name: "06-contact", path: "/homepage/contact" },
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, label: "d" },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, label: "m" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mode = process.argv[2] || "all";
const targets = mode === "all" ? ["desktop", "mobile"] : [mode];

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none", "--hide-scrollbars"],
  protocolTimeout: 600000,
});

const page = await browser.newPage();
page.setDefaultNavigationTimeout(120000);

for (const vpName of targets) {
  const vp = VIEWPORTS[vpName];
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });

  for (const p of PAGES) {
    const url = `${BASE}${p.path}`;
    await page.goto(url, { waitUntil: "networkidle2" });
    await sleep(500);

    // 觸發 lazy image + 進場動畫，然後強制全部顯示
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await sleep(400);

    // 等所有圖片解碼完（跑馬燈有 140 張 logo，唔等會影到白格）
    await page.evaluate(async () => {
      document.querySelectorAll("img[loading='lazy']").forEach((img) => {
        img.loading = "eager";
      });
      const done = Promise.all(
        Array.from(document.images).map((img) =>
          img.complete ? Promise.resolve() : new Promise((r) => {
            img.addEventListener("load", r, { once: true });
            img.addEventListener("error", r, { once: true });
          })
        )
      );
      await Promise.race([done, new Promise((r) => setTimeout(r, 4000))]);
    });
    await sleep(600);

    await page.evaluate(() => {
      document.querySelectorAll("[data-rv]").forEach((el) => {
        el.classList.add("s-rv", "is-in");
        el.style.transition = "none";
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      document.querySelectorAll(".s-marquee").forEach((el) => {
        el.style.animation = "none";
      });
      const st = document.createElement("style");
      st.textContent =
        "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}nextjs-portal{display:none!important}";
      document.head.appendChild(st);
    });
    await sleep(350);

    const height = await page.evaluate(() => document.body.scrollHeight);
    const file = path.join(OUT, `${p.name}-${vp.label}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${p.name}-${vp.label}: ${vp.width}x${height} -> ${file}`);

    // 首屏（唔用 fullPage）方便睇 hero 細節
    if (vpName === "desktop") {
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(200);
      await page.screenshot({ path: path.join(OUT, `${p.name}-${vp.label}-hero.png`), fullPage: false });
    }
  }
}

await browser.close();
console.log("done");
