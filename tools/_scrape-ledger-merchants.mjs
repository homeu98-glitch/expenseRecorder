// 抓 macau-ledger 線上商家目錄（公開頁 /wallet?all=1），輸出 tools/ledger-merchants.json
// 用法：node tools/_scrape-ledger-merchants.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("C:/Users/surface/.workbuddy-ai/binaries/node/workspace/package.json");
const puppeteer = require("puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "https://macau-ledger.vercel.app/wallet?all=1";
const OUT = path.resolve("tools/ledger-merchants.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  protocolTimeout: 600000,
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.setDefaultNavigationTimeout(90000);

const seen = new Map();

for (let p = 1; p <= 12; p += 1) {
  const url = p === 1 ? BASE : `${BASE}&page=${p}`;
  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector('a[href^="/wallet/merchant/"]', { timeout: 30000 }).catch(() => {});
  await sleep(400);

  const cards = await page.$$eval('a[href^="/wallet/merchant/"]', (els) =>
    els.map((a) => {
      const img = a.querySelector("img");
      return {
        href: a.getAttribute("href") || "",
        logo: img ? img.getAttribute("src") || "" : "",
        alt: img ? img.getAttribute("alt") || "" : "",
        ps: [...a.querySelectorAll("p")].map((n) => (n.textContent || "").trim()).filter(Boolean),
        spans: [...a.querySelectorAll("span")].map((n) => (n.textContent || "").trim()).filter(Boolean),
        text: (a.textContent || "").trim(),
      };
    }),
  );

  let added = 0;
  for (const c of cards) {
    const id = (c.href.split("/wallet/merchant/")[1] || "").split("?")[0];
    if (!id || seen.has(id)) continue;
    const name = c.ps[0] || c.alt.replace(/\s*圖示$/, "") || "";
    const cats = ["餐飲", "美容", "零售", "服務", "其他"];
    const category = c.spans.find((s) => cats.includes(s)) || "";
    const address = c.ps.find((s) => s !== name && (s.startsWith("澳門") || s.includes("號") || s.includes("街"))) || "";
    const desc =
      c.ps
        .filter((s) => s !== name && s !== address)
        .sort((a, b) => b.length - a.length)[0] || "";
    const tags = c.spans.filter((s) => s.startsWith("#")).map((s) => s.replace(/^#/, ""));
    seen.set(id, { id, name, category, address, desc, tags, logo: c.logo });
    added += 1;
  }

  console.log(`page ${p}: cards=${cards.length} new=${added} total=${seen.size}`);
  if (cards.length === 0) break;
  if (added === 0 && p > 1) break;
}

await browser.close();

const list = [...seen.values()].filter((m) => m.name);
fs.writeFileSync(OUT, JSON.stringify(list, null, 2), "utf8");
console.log(`saved ${list.length} merchants -> ${OUT}`);
console.log(list.slice(0, 5));
