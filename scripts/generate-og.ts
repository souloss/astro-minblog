#!/usr/bin/env npx tsx
/* eslint-disable no-console */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn, execSync } from "node:child_process";
import sharp from "sharp";

const rootDir = process.cwd();
const inputDir = path.join(rootDir, ".codex-temp", "og");
const outputJpg = path.join(rootDir, "public", "astro-minblog-og.jpg");
const outputPng = path.join(rootDir, ".codex-temp", "og-result.png");

// ─── 画布 ────────────────────────────────────────────────────────────────────
const outputWidth  = 2400;
const outputHeight = 1260;

// ─── 旋转角度（负 = 逆时针倾斜） ─────────────────────────────────────────────
const angleDeg = -32;

// ─── 卡片内容区尺寸（更大，以便人眼能看清内容）──────────────────────────────
const cardWidth  = 840;
const cardHeight = 526;

// ─── 卡片帧留白（内容区四周的空白，让卡片之间有视觉间隙）────────────────────
//     SVG 阴影扩散需要这块空间，同时提供"上下左右间距"
const cardPad = 36;

// ─── 网格参数（正交坐标系，旋转前） ─────────────────────────────────────────
const cols = 4;
const rows = 3;

// 列中心点的水平间距 = 卡片宽 + 列间隙
const colSpacing = cardWidth + cardPad * 2 + 80;   // ≈ 1048

// 行中心点的垂直间距 = 卡片高 + 行间隙
// !! 关键修复：必须 > cardHeight，否则卡片在旋转前就重叠
const rowSpacing = cardHeight + cardPad * 2 + 72;  // ≈ 670

// ─── 截图配置 ─────────────────────────────────────────────────────────────────
const pages = [
  { url: "/zh/",                          filename: "home-light.png",       theme: "light" },
  { url: "/zh/",                          filename: "home-dark.png",        theme: "dark"  },
  { url: "/zh/categories/",              filename: "categories-light.png",  theme: "light" },
  { url: "/zh/posts/",                   filename: "posts-light.png",       theme: "light" },
  { url: "/zh/tags/",                    filename: "tags-light.png",        theme: "light" },
  { url: "/zh/search/",                  filename: "search-light.png",      theme: "light" },
  { url: "/zh/friends/",                 filename: "friends-light.png",     theme: "light" },
  { url: "/zh/about/",                   filename: "about-light.png",       theme: "light" },
  { url: "/zh/posts/dynamic-og-images/", filename: "post-light.png",        theme: "light" },
  { url: "/zh/archives/",               filename: "archives-light.png",    theme: "light" },
  { url: "/zh/",                          filename: "home-light2.png",       theme: "light" },
  { url: "/zh/posts/",                   filename: "posts-dark.png",        theme: "dark"  },
];

// ─── 布局：gridLayout[行][列] = 文件名 ───────────────────────────────────────
const gridLayout: (string | null)[][] = [
  ["home-dark.png",    "posts-light.png",    "tags-light.png",    "about-light.png"  ],
  ["home-light.png",   "categories-light.png","search-light.png", "post-light.png"   ],
  ["friends-light.png","archives-light.png", "home-light2.png",   "posts-dark.png"   ],
];

// ─── 旋转坐标（将正交网格坐标旋转 angleDeg）─────────────────────────────────
//    !! 关键：必须同时旋转"坐标"和"卡片本身"，两者角度保持一致，
//       才能让同一列的卡片在旋转后依然垂直对齐（沿倾斜方向排成一列）
function rotatePoint(x: number, y: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: x * Math.cos(rad) - y * Math.sin(rad),
    y: x * Math.sin(rad) + y * Math.cos(rad),
  };
}

// ─── 背景 SVG ─────────────────────────────────────────────────────────────────
function backgroundSvg(w: number, h: number) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E8ECF2"/>
      <stop offset="0.5" stop-color="#DEE5EE"/>
      <stop offset="1"   stop-color="#D5DDE8"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="32"/>
    </filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g opacity="0.78" filter="url(#glow)">
    <rect x="100"  y="-900" width="180" height="3200" rx="90" transform="rotate(45 240 660)"  fill="#FFFFFF"/>
    <rect x="980"  y="-940" width="196" height="3300" rx="98" transform="rotate(45 1060 655)" fill="#F6FAFD"/>
    <rect x="1860" y="-910" width="180" height="3240" rx="90" transform="rotate(45 1880 650)" fill="#FFFFFF"/>
  </g>
</svg>`;
}

// ─── 卡片 SVG（圆角 + 阴影 + 内容图像） ─────────────────────────────────────
function cardSvg(imageBase64: string) {
  const p = cardPad;
  const r = 20;
  const fw = cardWidth  + p * 2;
  const fh = cardHeight + p * 2;

  return `<svg width="${fw}" height="${fh}" viewBox="0 0 ${fw} ${fh}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="clip">
      <rect x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}" rx="${r}"/>
    </clipPath>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="190%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#1A2840" flood-opacity="0.16"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}" rx="${r}" fill="#FAFAF8"/>
    <image
      href="data:image/png;base64,${imageBase64}"
      x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}"
      preserveAspectRatio="xMidYMid slice"
      clip-path="url(#clip)"/>
    <rect x="${p}" y="${p}" width="${cardWidth}" height="${cardHeight}"
      rx="${r}" fill="none" stroke="#D4DCE7" stroke-width="1.5"/>
  </g>
</svg>`;
}

// ─── 渲染单张卡片（裁剪 → 帧 → 旋转） ───────────────────────────────────────
async function renderCard(filename: string) {
  const isDark     = filename.includes("dark");
  const gravity    = filename.includes("friends") ? "center" : "north";
  const brightness = isDark ? 1.07 : 1.03;
  const saturation = isDark ? 1.12 : 1.06;

  // 1. 截图裁剪到卡片内容区
  const cropped = await sharp(path.join(inputDir, filename))
    .resize(cardWidth, cardHeight, { fit: "cover", position: gravity })
    .modulate({ brightness, saturation })
    .sharpen()
    .png()
    .toBuffer();

  // 2. 合成卡片帧（圆角 + 阴影 + 边框 + padding）
  const framed = await sharp(Buffer.from(cardSvg(cropped.toString("base64"))))
    .png()
    .toBuffer();

  // 3. 旋转卡片本身（透明背景）
  //    !! 与 rotatePoint() 使用同一角度，保证列内对齐
  const rotated = await sharp(framed)
    .rotate(angleDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const { width = 0, height = 0 } = await sharp(rotated).metadata();
  return { input: rotated, width, height };
}

// ─── 启动预览服务器 ────────────────────────────────────────────────────────────
function startPreviewServer(): Promise<{ url: string; kill: () => void }> {
  return new Promise((resolve, reject) => {
    console.log("🚀 Starting preview server...");
    const server = spawn("pnpm", ["run", "preview"], {
      cwd: rootDir, stdio: ["ignore", "pipe", "pipe"], detached: false,
    });
    let url = "";
    server.stdout.on("data", (data) => {
      const out = data.toString();
      console.log(out);
      const m = out.match(/localhost:(\d+)/);
      if (m && !url) {
        url = `http://localhost:${m[1]}`;
        console.log(`✅ Server ready at ${url}`);
        setTimeout(() => resolve({ url, kill: () => server.kill("SIGTERM") }), 2000);
      }
    });
    server.stderr.on("data", (d) => {
      const s = d.toString();
      if (!s.includes("Prebundling") && !s.includes("hmr")) console.error(s);
    });
    server.on("error", reject);
    setTimeout(() => { if (!url) reject(new Error("Server startup timeout")); }, 30000);
  });
}

// ─── 截图 ─────────────────────────────────────────────────────────────────────
async function captureScreenshots(baseUrl: string) {
  console.log("\n📸 Starting screenshot capture...");
  await mkdir(inputDir, { recursive: true });

  const puppeteer = await import("puppeteer-core");
  const chromePaths = [
    "/opt/google/chrome/chrome", "/usr/bin/google-chrome",
    "/usr/bin/chromium",          "/usr/bin/chromium-browser",
  ];
  let chromePath = "";
  for (const p of chromePaths) {
    try { execSync(`ls -f ${p}`, { stdio: "ignore" }); chromePath = p; break; }
    catch { /* try next */ }
  }
  if (!chromePath) { console.error("Chrome not found"); process.exit(1); }

  const browser = await puppeteer.default.launch({
    executablePath: chromePath, headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const cfg of pages) {
      console.log(`   Capturing: ${cfg.filename}`);
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: cfg.theme }]);
      await page.goto(`${baseUrl}${cfg.url}`, { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({
        path: path.join(inputDir, cfg.filename) as `${string}.png`, type: "png",
      });
      console.log(`   ✅ ${cfg.filename}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log("✅ All screenshots captured!");
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(path.join(rootDir, ".codex-temp"), { recursive: true });
  const server = await startPreviewServer();

  try {
    await captureScreenshots(server.url);

    console.log("\n🎨 Compositing OG image...");

    const cx = outputWidth  / 2;  // 1200
    const cy = outputHeight / 2;  // 630
    const composites: sharp.CompositeSharpInput[] = [];

    for (let col = 0; col < cols; col++) {
      // ── Step 1：确定列中心 X（正交坐标系，旋转前）────────────────────────
      const gridX = (col - (cols - 1) / 2) * colSpacing;

      for (let row = 0; row < rows; row++) {
        const filename = gridLayout[row]?.[col];
        if (!filename) continue;

        // ── Step 2：确定行中心 Y（正交坐标系，旋转前）─────────────────────
        //    同一列所有卡片的 gridX 完全相同 → 旋转后沿倾斜方向对齐
        const gridY = (row - (rows - 1) / 2) * rowSpacing;

        // ── Step 3：旋转坐标到最终画布坐标 ───────────────────────────────
        const pos = rotatePoint(gridX, gridY);

        // ── Step 4：渲染（卡片本身也旋转相同角度）─────────────────────────
        const card = await renderCard(filename);

        composites.push({
          input: card.input,
          left:  Math.round(cx + pos.x - card.width  / 2),
          top:   Math.round(cy + pos.y - card.height / 2),
        });
      }
    }

    const bg     = Buffer.from(backgroundSvg(outputWidth, outputHeight));
    const result = sharp(bg).composite(composites);

    await result.clone().png().toFile(outputPng);
    await result.clone().jpeg({ quality: 93, mozjpeg: true }).toFile(outputJpg);

    console.log(`\n✅ Done!`);
    console.log(`   PNG → ${outputPng}`);
    console.log(`   JPG → ${outputJpg}`);
  } finally {
    console.log("\n🛑 Stopping server...");
    server.kill();
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });