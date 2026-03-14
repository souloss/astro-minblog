/**
 * 共享工具函数
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export const ROOT_DIR = join(__dirname, "..", "..");
export const DATA_DIR = join(ROOT_DIR, "datas");
export const BLOG_DIR = join(ROOT_DIR, "src/data/blog");

// ─── 环境变量加载 ────────────────────────────────────────

export async function loadEnv(): Promise<void> {
  const envPath = join(ROOT_DIR, ".env");
  try {
    const content = await readFile(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env 不存在时继续
  }
}

// ─── JSON 文件操作 ────────────────────────────────────────

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ─── 文本处理 ────────────────────────────────────────────────

export function truncate(text: string, max = 120): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function normalizeSpace(text: string): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

// ─── CLI 参数解析 ─────────────────────────────────────────────

export function parseCliArgs<T extends Record<string, unknown>>(
  defaults: T,
  parsers?: Partial<{ [K in keyof T]: (value: string) => T[K] }>
): T {
  const args = process.argv.slice(2);
  const result = { ...defaults };

  // Build a map of all possible key variants
  const keyMap = new Map<string, keyof T>();
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const keyStr = String(key);
    keyMap.set(keyStr, key);
    keyMap.set(keyStr.toLowerCase(), key);
    // kebab-case from camelCase (noAI -> no-a-i for each capital)
    const kebabKey = keyStr.replace(/[A-Z]/g, (c: string) => `-${c}`).toLowerCase();
    keyMap.set(kebabKey, key);
    // Also handle natural kebab-case (noAI -> no-ai)
    // This handles cases like noAI -> no-ai (user types --no-ai)
    const naturalKebab = keyStr.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    keyMap.set(naturalKebab, key);
  }
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex === -1) {
        // Boolean flag
        const key = arg.slice(2);
        const mappedKey = keyMap.get(key) || keyMap.get(key.toLowerCase());
        if (mappedKey && typeof result[mappedKey] === "boolean") {
          (result as Record<string, unknown>)[String(mappedKey)] = true;
        }
      } else {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        const mappedKey = keyMap.get(key) || keyMap.get(key.toLowerCase());
        if (mappedKey) {
          const parser = parsers?.[mappedKey];
          (result as Record<string, unknown>)[String(mappedKey)] = parser
            ? parser(value)
            : value;
        }
      }
    }
  }

  return result;
}

// ─── 其他工具 ─────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toPlainDate(value: unknown): string {
  if (!value) return "";
  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

export function contentHash(text: string): string {
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}