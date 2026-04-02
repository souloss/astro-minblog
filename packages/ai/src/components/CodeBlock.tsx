import { useEffect, useState } from "preact/hooks";
import type { FunctionalComponent, VNode } from "preact";
import { CopyButton } from "./VizShared.tsx";
import { MermaidBlock } from "./MermaidBlock.tsx";
import { MarkmapBlock } from "./MarkmapBlock.tsx";
import { normalizeCodeBlockLang } from "../utils/text.js";

export { MermaidBlock, MarkmapBlock };

export interface CodeBlockProps {
  code: string;
  lang?: string;
  isStreaming?: boolean;
}

export interface HighlightResult {
  html: string;
  loading: boolean;
  error?: string;
}

interface ShikiLike {
  codeToHtml: (
    code: string,
    options: { lang: string; theme: string }
  ) => Promise<string>;
}

let shikiModule: Promise<unknown> | null = null;
let highlighterCache: ShikiLike | null = null;

async function loadShikiHighlighter(): Promise<ShikiLike | null> {
  if (highlighterCache) return highlighterCache;

  if (!shikiModule) {
    shikiModule = import("shiki").catch(() => null);
  }

  const mod = await shikiModule;
  if (!mod || typeof mod !== "object") return null;

  const shiki = mod as { codeToHtml?: unknown };
  if (typeof shiki.codeToHtml === "function") {
    highlighterCache = shiki as ShikiLike;
    return highlighterCache;
  }

  return null;
}

export function useShikiHighlighter(
  code: string,
  lang?: string
): HighlightResult {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const normalizedLang = normalizeCodeBlockLang(lang);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(undefined);

    loadShikiHighlighter()
      .then(async highlighter => {
        if (!mounted) return;

        if (!highlighter) {
          setHtml(escapeHtml(code));
          setLoading(false);
          return;
        }

        try {
          const isDark =
            typeof document !== "undefined" &&
            document.documentElement.getAttribute("data-theme") === "dark";
          const theme = isDark ? "github-dark" : "github-light";

          const highlighted = await highlighter.codeToHtml(code, {
            lang: normalizedLang,
            theme,
          });

          if (mounted) {
            setHtml(highlighted);
            setLoading(false);
          }
        } catch (err) {
          if (mounted) {
            setHtml(escapeHtml(code));
            setError(err instanceof Error ? err.message : "Highlight error");
            setLoading(false);
          }
        }
      })
      .catch(err => {
        if (mounted) {
          setHtml(escapeHtml(code));
          setError(err instanceof Error ? err.message : "Shiki load error");
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [code, normalizedLang]);

  return { html, loading, error };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Regular Code Block ───────────────────────────────────────────

export function CodeBlock({ code, lang, isStreaming }: CodeBlockProps): VNode {
  const normalizedLang = normalizeCodeBlockLang(lang);

  // For mermaid/markmap, pass empty code to avoid loading shiki, but still call hook at top level
  const shikiCode = (normalizedLang === "mermaid" || normalizedLang === "markmap" || normalizedLang === "mindmap")
    ? ""
    : code;

  // ALWAYS call hooks at top level - Rules of Hooks violation if called conditionally
  const { html, loading, error } = useShikiHighlighter(shikiCode, lang);

  // Handle special languages with early returns AFTER hook calls
  if (normalizedLang === "mermaid") {
    return <MermaidBlock code={code} isStreaming={isStreaming} />;
  }

  if (normalizedLang === "markmap" || normalizedLang === "mindmap") {
    return <MarkmapBlock code={code} isStreaming={isStreaming} />;
  }

  // Regular code block rendering using hook results
  if (isStreaming || loading) {
    return (
      <div class="code-block-wrapper group relative">
        <pre class="bg-muted/60 overflow-x-auto rounded-md px-3 py-2 font-mono text-[12px] leading-relaxed">
          <code>{code}</code>
        </pre>
        {lang && (
          <span class="text-foreground-soft/50 bg-muted/80 absolute top-1 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium">
            {lang}
          </span>
        )}
      </div>
    );
  }

  if (html && !error) {
    return (
      <div class="code-block-wrapper group relative">
        <div
          class="code-highlight [&_pre]:!bg-muted/60 overflow-x-auto rounded-md text-[12px] leading-relaxed [&_pre]:!m-0 [&_pre]:!p-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {lang && (
          <span class="text-foreground-soft/50 bg-muted/80 absolute top-1 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium">
            {lang}
          </span>
        )}
        <CopyButton code={code} />
      </div>
    );
  }

  return (
    <div class="code-block-wrapper group relative">
      <pre class="bg-muted/60 overflow-x-auto rounded-md px-3 py-2 font-mono text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>
      {lang && (
        <span class="text-foreground-soft/50 bg-muted/80 absolute top-1 right-2 rounded px-1.5 py-0.5 text-[10px] font-medium">
          {lang}
        </span>
      )}
      {error && (
        <span class="text-accent absolute bottom-1 right-2 text-[10px]">
          {error}
        </span>
      )}
    </div>
  );
}

// ── Follow Up Suggestions ────────────────────────────────────────

export interface FollowUpSuggestion {
  text: string;
  icon?: string;
}

interface FollowUpSuggestionsProps {
  suggestions: FollowUpSuggestion[];
  onSend: (text: string) => void;
  lang?: string;
}

export function generateFollowUpSuggestions(
  responseText: string,
  articleContext?: { title?: string; keyPoints?: string[] }
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];
  const lowerText = responseText.toLowerCase();

  if (
    lowerText.includes("```") ||
    lowerText.includes("code") ||
    lowerText.includes("代码")
  ) {
    suggestions.push({ text: "解释这段代码", icon: "code" });
  }

  if (
    lowerText.includes("config") ||
    lowerText.includes("配置") ||
    lowerText.includes("设置")
  ) {
    suggestions.push({ text: "详细配置步骤", icon: "config" });
  }

  if (
    lowerText.includes("文章") ||
    lowerText.includes("article") ||
    lowerText.includes("post")
  ) {
    suggestions.push({ text: "推荐相关文章", icon: "article" });
  }

  if (lowerText.includes("如何") || lowerText.includes("how to")) {
    suggestions.push({ text: "举个具体例子", icon: "example" });
  }

  if (articleContext?.title) {
    suggestions.push({
      text: `详解 "${articleContext.title.slice(0, 20)}..."`,
      icon: "detail",
    });
  }

  return suggestions.slice(0, 3);
}

export const FollowUpSuggestions: FunctionalComponent<
  FollowUpSuggestionsProps
> = ({ suggestions, onSend }) => {
  if (suggestions.length === 0) return null;

  return (
    <div class="follow-up-suggestions mt-2 flex flex-wrap gap-1.5">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSend(s.text)}
          class="border-border bg-muted/30 text-foreground-soft hover:border-accent/40 hover:bg-accent/10 hover:text-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors"
        >
          {s.text}
        </button>
      ))}
    </div>
  );
};
