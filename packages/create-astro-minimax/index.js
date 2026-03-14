#!/usr/bin/env node
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const templateDir = join(__dirname, "template");

const projectName = process.argv[2];
if (!projectName) {
  console.error("Usage: create-astro-minimax <project-name>");
  process.exit(1);
}

const targetDir = resolve(process.cwd(), projectName);

if (existsSync(targetDir)) {
  console.error(`Directory "${projectName}" already exists.`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
cpSync(templateDir, targetDir, { recursive: true });

const pkgPath = join(targetDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
pkg.name = basename(targetDir);
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`\n  Created "${projectName}" successfully!\n`);
console.log("  Next steps:\n");
console.log(`    cd ${projectName}`);
console.log("    pnpm install");
console.log("    pnpm dev\n");
