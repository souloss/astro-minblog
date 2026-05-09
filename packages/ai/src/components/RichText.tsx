import { useMemo } from "preact/hooks";
import { CodeBlock } from "./CodeBlock.tsx";

const SAFE_URL_RE = /^(?:https?|mailto):/i;

function sanitizeUrl(url: string): string {
  if (SAFE_URL_RE.test(url) || url.startsWith("/") || url.startsWith("#"))
    return url;
  return "#";
}

type InlinePart =
  | { type: "text"; text: string }
  | { type: "link"; label: string; url: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "citation"; label: string; title?: string; url?: string };

/**
 * 更健壮的 Markdown 链接解析器
 *
 * 处理以下边界情况：
 * 1. URL 中包含括号：[text](url(with)parentheses)
 * 2. 标签中包含方括号：[text [with] brackets](url)
 * 3. 未闭合的语法：[text](url 或 [text](url)
 */
export function parseInlineMarkdownRobust(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let i = 0;

  while (i < text.length) {
    // 检测链接开始
    if (text[i] === "[") {
      const linkResult = tryParseLink(text, i);
      if (linkResult) {
        parts.push({
          type: "link",
          label: linkResult.label,
          url: linkResult.url,
        });
        i = linkResult.endIndex;
        continue;
      }
    }

    if (text.slice(i, i + 2) === "**") {
      const afterFirstMarker = text.slice(i + 2);
      const skipCount = (afterFirstMarker.match(/^\*+/) ?? [""])[0].length;
      const searchStart = i + 2 + skipCount;
      const boldEnd = text.indexOf("**", searchStart);
      if (boldEnd !== -1) {
        const boldContent = text.slice(searchStart, boldEnd);
        parts.push({ type: "bold", text: boldContent });
        i = boldEnd + 2;
        continue;
      }
    }

    // 检测行内代码开始
    if (text[i] === "`" && text[i + 1] !== "`") {
      const codeEnd = text.indexOf("`", i + 1);
      if (codeEnd !== -1) {
        parts.push({ type: "code", text: text.slice(i + 1, codeEnd) });
        i = codeEnd + 1;
        continue;
      }
    }

    // 检测引用标记开始 【label|content】 or 【label|title|url】
    if (text[i] === "【") {
      const citationResult = tryParseCitation(text, i);
      if (citationResult) {
        parts.push({ type: "citation", ...citationResult });
        i = citationResult.endIndex;
        continue;
      }
    }

    // 收集纯文本直到下一个特殊字符
    let textEnd = i + 1;
    while (
      textEnd < text.length &&
      text[textEnd] !== "[" &&
      text[textEnd] !== "【" &&
      text[textEnd] !== "*" &&
      text[textEnd] !== "`"
    ) {
      textEnd++;
    }

    if (textEnd > i) {
      parts.push({ type: "text", text: text.slice(i, textEnd) });
    }
    i = textEnd;
  }

  return parts;
}

/**
 * 尝试从指定位置解析链接
 * 返回 { label, url, endIndex } 或 null
 */
function tryParseLink(
  text: string,
  start: number
): { label: string; url: string; endIndex: number } | null {
  if (text[start] !== "[") return null;

  // 找到标签结束位置（处理嵌套方括号）
  let depth = 1;
  let labelEnd = start + 1;
  while (labelEnd < text.length && depth > 0) {
    if (text[labelEnd] === "[") depth++;
    else if (text[labelEnd] === "]") depth--;
    else if (text[labelEnd] === "\\" && labelEnd + 1 < text.length) labelEnd++; // 跳过转义字符
    labelEnd++;
  }

  if (depth !== 0 || labelEnd >= text.length || text[labelEnd] !== "(")
    return null;

  const label = text.slice(start + 1, labelEnd - 1).replace(/\\(.)/g, "$1");

  // 找到 URL 结束位置（处理嵌套括号）
  const urlStart = labelEnd + 1;
  depth = 1;
  let urlEnd = urlStart;
  while (urlEnd < text.length && depth > 0) {
    if (text[urlEnd] === "(") depth++;
    else if (text[urlEnd] === ")") depth--;
    urlEnd++;
  }

  if (depth !== 0) return null;

  const url = text.slice(urlStart, urlEnd - 1).trim();

  return { label, url, endIndex: urlEnd };
}

function tryParseCitation(
  text: string,
  start: number
): { label: string; title?: string; url?: string; endIndex: number } | null {
  if (text[start] !== "【") return null;

  const endMarker = text.indexOf("】", start);
  if (endMarker === -1) return null;

  const inner = text.slice(start + 1, endMarker);
  const parts = inner.split("|").map(p => p.trim());

  if (parts.length < 2) return null;

  const label = parts[0];
  const result: {
    label: string;
    title?: string;
    url?: string;
    endIndex: number;
  } = {
    label,
    endIndex: endMarker + 1,
  };

  if (parts.length === 2) {
    result.title = parts[1];
  } else if (parts.length >= 3) {
    result.title = parts[1];
    const potentialUrl = parts[2];
    if (
      potentialUrl.startsWith("http://") ||
      potentialUrl.startsWith("https://") ||
      potentialUrl.startsWith("/")
    ) {
      result.url = potentialUrl;
    } else {
      result.title += " " + potentialUrl;
    }
  }

  return result;
}

function ExternalLinkIcon() {
  return (
    <svg
      class="inline-block size-3 shrink-0 opacity-50"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function InlineRichText({ text }: { text: string }) {
  const parts = useMemo(() => parseInlineMarkdownRobust(text), [text]);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.type === "link") {
          const safeUrl = sanitizeUrl(p.url);
          const isExternal = safeUrl.startsWith("http");
          return (
            <a
              key={i}
              href={safeUrl}
              class="text-accent decoration-accent/30 hover:decoration-accent inline-flex items-center gap-0.5 font-medium underline underline-offset-2 transition-colors"
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
            >
              {p.label}
              {isExternal && <ExternalLinkIcon />}
            </a>
          );
        }
        if (p.type === "bold")
          return (
            <strong key={i} class="font-semibold">
              {p.text}
            </strong>
          );
        if (p.type === "code")
          return (
            <code
              key={i}
              class="bg-muted/60 text-foreground-soft rounded px-1 py-0.5 font-mono text-[13px]"
            >
              {p.text}
            </code>
          );
        if (p.type === "citation") {
          const content = (
            <>
              <span class="text-accent/70">{p.label}</span>
              {p.title && <span class="text-foreground-soft">{p.title}</span>}
            </>
          );
          if (p.url) {
            const safeUrl = sanitizeUrl(p.url);
            const isExternal = safeUrl.startsWith("http");
            return (
              <a
                key={i}
                href={safeUrl}
                class="text-accent decoration-accent/30 hover:decoration-accent inline-flex items-center gap-0.5 font-medium underline underline-offset-2 transition-colors"
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {content}
                {isExternal && <ExternalLinkIcon />}
              </a>
            );
          }
          return (
            <span key={i} class="inline-flex items-center gap-0.5">
              {content}
            </span>
          );
        }
        return <span key={i}>{p.text}</span>;
      })}
    </span>
  );
}

// ── Block-level Markdown Rendering ────────────────────────────

interface BlockNode {
  type: "paragraph" | "code-block" | "blockquote" | "list" | "heading";
  content: string;
  lang?: string;
  ordered?: boolean;
  items?: string[];
  unclosed?: boolean;
  level?: number; // 1-6 for headings
}

export function parseBlocks(text: string): BlockNode[] {
  const lines = text.split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      let closed = false;
      while (i < lines.length) {
        if (lines[i].startsWith("```")) {
          closed = true;
          i++;
          break;
        }
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "code-block",
        content: codeLines.join("\n"),
        lang: lang || undefined,
        unclosed: !closed,
      });
      continue;
    }

    if (line.startsWith("> ") || line === ">") {
      const quoteLines: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith("> ") || lines[i] === ">")
      ) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      blocks.push({ type: "list", content: "", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ type: "list", content: "", ordered: true, items });
      continue;
    }

    // Heading detection: 1-6 # followed by a space
    const headingMatch = line.match(/^(#{1,6})\s(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        content: headingMatch[2].trim(),
        level: headingMatch[1].length,
      });
      i++;
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ") &&
      lines[i] !== ">" &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^#{1,6}\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: "paragraph", content: paraLines.join("\n") });
    }
  }

  return blocks;
}

export function RichText({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div class="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "code-block":
            return (
              <CodeBlock
                key={i}
                code={block.content}
                lang={block.lang}
                isStreaming={isStreaming || block.unclosed}
              />
            );
          case "blockquote":
            return (
              <blockquote
                key={i}
                class="border-accent/40 text-foreground-soft border-l-2 pl-3 italic"
              >
                <InlineRichText text={block.content} />
              </blockquote>
            );
          case "list":
            if (block.ordered) {
              return (
                <ol key={i} class="text-foreground-soft list-decimal space-y-0.5 pl-5">
                  {block.items?.map((item, j) => (
                    <li key={j}>
                      <InlineRichText text={item} />
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={i} class="text-foreground-soft list-disc space-y-0.5 pl-5">
                {block.items?.map((item, j) => (
                  <li key={j}>
                    <InlineRichText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "heading": {
            const level = block.level ?? 3;
            const sizeClass =
              level <= 2
                ? "text-sm font-bold"
                : level <= 4
                  ? "text-[13px] font-bold"
                  : "text-[12px] font-semibold";
            return (
              <p key={i} class={sizeClass}>
                <InlineRichText text={block.content} />
              </p>
            );
          }
          case "paragraph":
          default:
            return (
              <p key={i} class="whitespace-pre-wrap">
                <InlineRichText text={block.content} />
              </p>
            );
        }
      })}
    </div>
  );
}
