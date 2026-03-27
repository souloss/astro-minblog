/**
 * Text normalization and tokenization utilities.
 * Shared between search, intelligence, and other modules.
 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  const parts = normalized.split(/\s+/).filter(Boolean);
  const expanded = parts.flatMap(part => expandToken(part));
  return dedupeByContainment(expanded);
}

function expandToken(token: string): string[] {
  if (!token) return [];
  if (/^[\u4e00-\u9fa5]+$/.test(token)) {
    return buildCjkTokenVariants(token);
  }
  return [token];
}

function buildCjkTokenVariants(text: string): string[] {
  const chars = [...text].filter(char => /[\u4e00-\u9fa5]/.test(char));
  if (chars.length <= 1) return chars;

  const variants = new Set<string>();

  for (const char of chars) {
    variants.add(char);
  }

  for (let size = 2; size <= Math.min(4, chars.length); size++) {
    for (let i = 0; i <= chars.length - size; i++) {
      variants.add(chars.slice(i, i + size).join(""));
    }
  }

  variants.add(chars.join(""));

  return [...variants];
}

export function dedupeByContainment(terms: string[]): string[] {
  const unique = [...new Set(terms)];
  const kept: string[] = [];
  for (const term of unique.sort((a, b) => b.length - a.length)) {
    if (!kept.some(existing => existing.includes(term))) {
      kept.push(term);
    }
  }
  return kept;
}

export function extractCodeAnchors(text: string): string[] {
  if (!text.trim()) return [];

  const anchors = new Set<string>();
  const patterns = [
    /`([^`]{2,})`/g,
    /\b[a-z]+[A-Z][A-Za-z0-9]*\b/g,
    /\buse[A-Z][A-Za-z0-9]*\b/g,
    /\b[a-zA-Z_][\w-]*\.(?:ts|tsx|js|jsx|astro|md|json)\b/g,
    /\b[a-zA-Z_][A-Za-z0-9_]*\(/g,
  ] as const;

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const rawValue = (match[1] ?? match[0] ?? "").trim();
      const value = rawValue.endsWith("(") ? rawValue.slice(0, -1) : rawValue;
      if (value.length >= 2) anchors.add(value);
    }
  }

  return [...anchors].sort((a, b) => b.length - a.length);
}

export function hasCodeAnchors(text: string): boolean {
  return extractCodeAnchors(text).length > 0;
}

const CODE_BLOCK_LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
  text: "plaintext",
};

export function normalizeCodeBlockLang(lang?: string): string {
  if (!lang) return "plaintext";
  const lower = lang.toLowerCase();
  return CODE_BLOCK_LANG_ALIASES[lower] || lower;
}
