import { t, getLang } from "../utils/i18n.js";

export function ReasoningBlock({
  text,
  isStreaming,
  lang = "zh",
}: {
  text: string;
  isStreaming?: boolean;
  lang?: string;
}) {
  const isEmpty = text.length === 0;
  const l = getLang(lang);
  return (
    <details
      class="group border-border/50 bg-muted/30 overflow-hidden rounded-lg border"
      open={isStreaming || !isEmpty}
    >
      <summary class="text-foreground-soft hover:bg-muted/50 hover:text-foreground flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium transition-colors">
        <svg
          class="size-3.5 transition-transform group-open:rotate-90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span class="flex items-center gap-1">
          {isStreaming ? (
            <svg
              class="size-3 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              class="size-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          )}
          {isStreaming && isEmpty
            ? t("ai.reasoning.thinking", l)
            : isStreaming
              ? t("ai.reasoning.thinking", l).replace("...", "")
              : t("ai.reasoning.viewReasoning", l)}
        </span>
      </summary>
      <div class="border-border/30 bg-background/50 border-t px-2.5 py-2">
        {isEmpty && isStreaming ? (
          <div class="text-foreground-soft flex items-center gap-2 text-[11px]">
            <span class="inline-flex gap-1">
              <span class="bg-foreground-soft size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
              <span class="bg-foreground-soft size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span class="bg-foreground-soft size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
            </span>
            <span>{t("ai.reasoning.waiting", l)}</span>
          </div>
        ) : (
          <pre class="text-foreground-soft font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
            {text}
          </pre>
        )}
      </div>
    </details>
  );
}
