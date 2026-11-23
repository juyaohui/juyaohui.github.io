import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://localhost:4173";
const outDir = path.resolve(process.cwd(), "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
if (!executablePath) {
  console.error("No Chrome/Edge found");
  process.exit(1);
}

const browser = await chromium.launch({ executablePath, headless: true });
const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

async function shot(name, url, viewport = desktop, options = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(options.wait ?? 1600);
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: options.fullPage ?? false,
    animations: "disabled",
  });
  console.log(`[shot] ${name} <- ${url}`);
  await page.close();
}

const styles = ["aurora", "paper", "mono"];
for (const style of styles) {
  await shot(`home-${style}`, `${base}/?style=${style}`, desktop);
}
await shot("home-aurora-full", `${base}/?style=aurora`, desktop, { fullPage: true });
await shot("posts", `${base}/posts/?style=aurora`, desktop, { wait: 1200 });
await shot("styles-page", `${base}/styles/?style=aurora`, desktop, { wait: 2200 });
await shot("post", `${base}/posts/随笔/如梦一场?style=paper`, desktop, { wait: 1200 });
await shot("notes", `${base}/notes/git/?style=aurora`, desktop, { wait: 1200 });
await shot("sync-mobile", `${base}/sync/?style=aurora`, mobile, { wait: 1800 });
await shot("home-mobile", `${base}/?style=aurora`, mobile, { wait: 1500 });

await browser.close();
console.log("[shot] done");
