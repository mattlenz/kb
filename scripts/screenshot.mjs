#!/usr/bin/env node

/**
 * Captures a screenshot of the built kb site for use in the README.
 *
 * Usage:   node scripts/screenshot.mjs
 * Prereq:  npx playwright install chromium
 * Output:  screenshots/index.png
 */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const OUT_DIR = join(ROOT, "screenshots");

// 1. Start dev server and wait for the URL
const dev = spawn("npx", ["kb", "dev"], { cwd: ROOT });
const url = await new Promise((resolve) => {
  dev.stdout.on("data", (chunk) => {
    const match = chunk.toString().match(/https?:\/\/[^\s]+/);
    if (match) resolve(match[0]);
  });
});

// 2. Screenshot
try {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  mkdirSync(OUT_DIR, { recursive: true });

  // Light mode
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT_DIR, "light.png") });
  console.log("Saved screenshots/light.png");

  // Dark mode
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT_DIR, "dark.png") });
  console.log("Saved screenshots/dark.png");
  await browser.close();
} finally {
  dev.kill();
}
