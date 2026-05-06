import { BotIcon } from "../MessageBubble.js";
import { t, getLang } from "../../utils/i18n.js";

type PanelSize = "S" | "M" | "L";

interface ChatToolbarProps {
  lang: string;
  isMockMode: boolean;
  articleContext?: { title: string };
  placeholder: string;
  panelSize: PanelSize;
  onSizeChange: (size: PanelSize) => void;
  onClear: () => void;
  onClose: () => void;
}

export function ChatToolbar({
  lang,
  isMockMode,
  articleContext,
  placeholder,
  panelSize,
  onSizeChange,
  onClear,
  onClose,
}: ChatToolbarProps) {
  const titleId = articleContext ? "ai-chat-title-reading" : "ai-chat-title";
  const descriptionId = articleContext
    ? "ai-chat-description-reading"
    : "ai-chat-description";

  return (
    <div class="border-border flex shrink-0 items-center justify-between border-b px-3.5 py-2.5" style="background: color-mix(in oklch, var(--background) 88%, transparent); backdrop-filter: saturate(180%) blur(12px); -webkit-backdrop-filter: saturate(180%) blur(12px);">
      <div class="flex items-center gap-2">
        <div class="bg-accent/15 flex size-6 shrink-0 items-center justify-center rounded-full">
          <BotIcon class="text-accent size-3" aria-hidden="true" />
        </div>
        <div class="flex flex-col">
          <span id={titleId} class="text-foreground text-[13px] font-semibold">
            {t("ai.assistantName", lang)}
          </span>
          {articleContext && (
            <span
              id={descriptionId}
              class="text-foreground-soft max-w-[180px] truncate text-[10px]"
            >
              {t("ai.header.reading", lang)}
              {articleContext.title}
            </span>
          )}
          {!articleContext && (
            <span id={descriptionId} class="sr-only">
              {placeholder}
            </span>
          )}
        </div>
        <span
          class={`rounded-full px-1.5 py-px text-[10px] font-medium ${
            isMockMode
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-green-500/15 text-green-600 dark:text-green-400"
          }`}
        >
          {isMockMode ? t("ai.header.mode", lang) : t("ai.status.live", lang)}
        </span>
      </div>
      <div class="flex items-center gap-0.5">
        <div class="border-border bg-muted/30 flex items-center gap-0.5 rounded-md border p-0.5">
          {(["S", "M", "L"] as const).map(size => (
            <button
              key={size}
              type="button"
              onClick={() => onSizeChange(size)}
              class={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                panelSize === size
                  ? "bg-accent text-background"
                  : "text-foreground-soft hover:text-foreground"
              }`}
              title={size === "S" ? "Small" : size === "M" ? "Medium" : "Large"}
              aria-label={
                size === "S"
                  ? "Small chat panel"
                  : size === "M"
                    ? "Medium chat panel"
                    : "Large chat panel"
              }
              aria-pressed={panelSize === size}
            >
              {size}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label={t("ai.clear", lang)}
          class="text-foreground-soft hover:bg-muted/60 hover:text-foreground rounded-md p-1 transition-colors"
          title={t("ai.clear", lang)}
        >
          <svg
            class="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("ai.close", lang)}
          class="text-foreground-soft hover:bg-muted/60 hover:text-foreground rounded-md p-1 transition-colors"
          title={t("ai.close", lang)}
        >
          <svg
            class="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
