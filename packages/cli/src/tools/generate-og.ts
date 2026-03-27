#!/usr/bin/env npx tsx
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import sharp from "sharp";

type ColorScheme =
  | "teal"
  | "ocean"
  | "rose"
  | "forest"
  | "midnight"
  | "sunset"
  | "mono"
  | "github";
type ThemeMode = "light" | "dark";

interface ScreenshotConfig {
  url: string;
  colorScheme: ColorScheme;
  theme: ThemeMode;
  filename: string;
}

const rootDir = process.cwd();
const tempDir = path.join(rootDir, ".temp");

const inputDir = path.join(tempDir, "og");
const outputJpg = path.join(rootDir, "public", "astro-minimax-og.jpg");

const outputWidth = 2400;
const outputHeight = 1260;
const angleDeg = -32;
const cardWidth = 840;
const cardHeight = 526;
const cardPad = 36;
const cols = 4;
const rows = 3;
const colSpacing = cardWidth + cardPad * 2 + 80;
const rowSpacing = cardHeight + cardPad * 2 + 72;

const pages: ScreenshotConfig[] = [
  {
    url: "/zh/",
    colorScheme: "teal",
    theme: "light",
    filename: "teal-light.png",
  },
  {
    url: "/zh/",
    colorScheme: "ocean",
    theme: "dark",
    filename: "ocean-dark.png",
  },
  {
    url: "/zh/",
    colorScheme: "rose",
    theme: "light",
    filename: "rose-light.png",
  },
  {
    url: "/zh/",
    colorScheme: "forest",
    theme: "dark",
    filename: "forest-dark.png",
  },
  {
    url: "/zh/",
    colorScheme: "midnight",
    theme: "dark",
    filename: "midnight-dark.png",
  },
  {
    url: "/zh/",
    colorScheme: "sunset",
    theme: "light",
    filename: "sunset-light.png",
  },
  {
    url: "/zh/",
    colorScheme: "mono",
    theme: "dark",
    filename: "mono-dark.png",
  },
  {
    url: "/zh/",
    colorScheme: "github",
    theme: "light",
    filename: "github-light.png",
  },
  {
    url: "/zh/",
    colorScheme: "ocean",
    theme: "light",
    filename: "ocean-light.png",
  },
  {
    url: "/zh/",
    colorScheme: "teal",
    theme: "dark",
    filename: "teal-dark.png",
  },
  {
    url: "/zh/",
    colorScheme: "forest",
    theme: "light",
    filename: "forest-light.png",
  },
  {
    url: "/zh/",
    colorScheme: "rose",
    theme: "dark",
    filename: "rose-dark.png",
  },
];

const gridLayout: (string | null)[][] = [
  ["teal-light.png", "ocean-dark.png", "rose-light.png", "forest-dark.png"],
  [
    "midnight-dark.png",
    "sunset-light.png",
    "mono-dark.png",
    "github-light.png",
  ],
  ["ocean-light.png", "teal-dark.png", "forest-light.png", "rose-dark.png"],
];

function rotatePoint(x: number, y: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

function backgroundSvg(w: number, h: number) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E8ECF2"/>
      <stop offset="0.5" stop-color="#DEE5EE"/>
      <stop offset="1" stop-color="#D5DDE8"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="32"/>
    </filter>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#4fd1c5" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0369a1" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.06"/>
    </linearGradient>
    <linearGradient id="midnightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#a78bfa" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g opacity="0.78" filter="url(#glow)">
    <rect x="100" y="-900" width="180" height="3200" rx="90" transform="rotate(45 240 660)" fill="#FFFFFF"/>
    <rect x="980" y="-940" width="196" height="3300" rx="98" transform="rotate(45 1060 655)" fill="#F6FAFD"/>
    <rect x="1860" y="-910" width="180" height="3240" rx="90" transform="rotate(45 1880 650)" fill="#FFFFFF"/>
  </g>
  <g opacity="0.5">
    <ellipse cx="400" cy="400" rx="400" ry="300" fill="url(#tealGrad)"/>
    <ellipse cx="1200" cy="200" rx="350" ry="250" fill="url(#oceanGrad)"/>
    <ellipse cx="2000" cy="800" rx="400" ry="300" fill="url(#midnightGrad)"/>
  </g>
</svg>`;
}

function cardSvg(imageBase64: string, isDark: boolean) {
  const p = cardPad;
  const r = 20;
  const fw = cardWidth + p * 2;
  const fh = cardHeight + p * 2;
  const bgColor = isDark ? "#1a1a1a" : "#FAFAF8";
  const shadowColor = isDark ? "#000000" : "#1A2840";
  const borderColor = isDark ? "#333333" : "#D4DCE7";
  const shadowOpacity = isDark ? 0.4 : 0.16;

  return `<svg width="${fw}" height="${fh}" viewBox="0 0 ${fw} ${fh}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip">
      <rect x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}" rx="${r}"/>
    </clipPath>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="190%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="${shadowColor}" flood-opacity="${shadowOpacity}"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}" rx="${r}" fill="${bgColor}"/>
    <image
      href="data:image/png;base64,${imageBase64}"
      x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}"
      preserveAspectRatio="xMidYMid slice"
      clip-path="url(#clip)"/>
    <rect x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}"
      rx="${r}" fill="none" stroke="${borderColor}" stroke-width="1.5"/>
  </g>
</svg>`;
}

async function renderCard(filename: string) {
  const isDark = filename.includes("dark");
  const gravity = "north";
  const brightness = isDark ? 1.05 : 1.03;
  const saturation = isDark ? 1.08 : 1.04;

  const cropped = await sharp(path.join(inputDir, filename))
    .resize(cardWidth, cardHeight, { fit: "cover", position: gravity })
    .modulate({ brightness, saturation })
    .sharpen()
    .png()
    .toBuffer();

  const framed = await sharp(
    Buffer.from(cardSvg(cropped.toString("base64"), isDark))
  )
    .png()
    .toBuffer();

  const rotated = await sharp(framed)
    .rotate(angleDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const { width = 0, height = 0 } = await sharp(rotated).metadata();
  return { input: rotated, width, height };
}

function startPreviewServer(): Promise<{ url: string; kill: () => void }> {
  return new Promise((resolve, reject) => {
    console.log("🚀 Starting preview server...");
    const server = spawn("pnpm", ["run", "preview"], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    let url = "";
    server.stdout.on("data", data => {
      const out = data.toString();
      console.log(out);
      const m = out.match(/localhost:(\d+)/);
      if (m && !url) {
        url = `http://localhost:${m[1]}`;
        console.log(`✅ Server ready at ${url}`);
        setTimeout(
          () => resolve({ url, kill: () => server.kill("SIGTERM") }),
          2000
        );
      }
    });
    server.stderr.on("data", d => {
      const s = d.toString();
      if (!s.includes("Prebundling") && !s.includes("hmr")) console.error(s);
    });
    server.on("error", reject);
    setTimeout(() => {
      if (!url) reject(new Error("Server startup timeout"));
    }, 30000);
  });
}

async function captureScreenshots(baseUrl: string) {
  console.log("\n📸 Starting screenshot capture...");
  await mkdir(inputDir, { recursive: true });

  const puppeteer = await import("puppeteer-core");
  const chromePaths = [
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  let chromePath = "";
  for (const p of chromePaths) {
    try {
      execSync(`ls -f ${p}`, { stdio: "ignore" });
      chromePath = p;
      break;
    } catch {
      /* continue */
    }
  }
  if (!chromePath) {
    console.error("Chrome not found");
    process.exit(1);
  }

  const browser = await puppeteer.default.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const cfg of pages) {
      console.log(
        `   Capturing: ${cfg.filename} (${cfg.colorScheme}/${cfg.theme})`
      );
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: cfg.theme },
      ]);
      await page.goto(`${baseUrl}${cfg.url}`, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });
      await new Promise(r => setTimeout(r, 500));

      await page.evaluate(
        (scheme: ColorScheme, theme: ThemeMode) => {
          const root = document.documentElement;
          root.setAttribute("data-color-scheme", scheme);
          root.setAttribute("data-theme", theme);
          root.offsetHeight;
        },
        cfg.colorScheme,
        cfg.theme
      );

      await new Promise(r => setTimeout(r, 800));

      await page.screenshot({
        path: path.join(inputDir, cfg.filename) as `${string}.png`,
        type: "png",
      });
      console.log(`   ✅ ${cfg.filename}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log("✅ All screenshots captured!");
}

async function main() {
  await mkdir(tempDir, { recursive: true });
  const server = await startPreviewServer();

  try {
    await captureScreenshots(server.url);

    console.log("\n🎨 Compositing OG image...");

    const cx = outputWidth / 2;
    const cy = outputHeight / 2;
    const composites: sharp.OverlayOptions[] = [];

    for (let col = 0; col < cols; col++) {
      const gridX = (col - (cols - 1) / 2) * colSpacing;

      for (let row = 0; row < rows; row++) {
        const filename = gridLayout[row]?.[col];
        if (!filename) continue;

        const gridY = (row - (rows - 1) / 2) * rowSpacing;
        const pos = rotatePoint(gridX, gridY);
        const card = await renderCard(filename);

        composites.push({
          input: card.input,
          left: Math.round(cx + pos.x - card.width / 2),
          top: Math.round(cy + pos.y - card.height / 2),
        });
      }
    }

    const bg = Buffer.from(backgroundSvg(outputWidth, outputHeight));
    const result = sharp(bg).composite(composites);

    await result.jpeg({ quality: 93, mozjpeg: true }).toFile(outputJpg);

    console.log(`\n✅ Done!`);
    console.log(`   JPG → ${outputJpg}`);
  } finally {
    console.log("\n🧹 Cleaning up temp files...");
    await rm(tempDir, { recursive: true, force: true });
    console.log("\n🛑 Stopping server...");
    server.kill();
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
