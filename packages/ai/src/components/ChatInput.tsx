import { useCallback, useEffect, useRef } from "preact/hooks";

export interface ChatInputProps {
  value: string;
  onInput: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  cooldown: boolean;
  placeholder: string;
  label: string;
  sendLabel: string;
  sendingLabel: string;
  focusTrigger?: boolean;
}

export function ChatInput({
  value,
  onInput,
  onSend,
  isStreaming,
  cooldown,
  placeholder,
  label,
  sendLabel,
  sendingLabel,
  focusTrigger,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  useEffect(() => {
    if (focusTrigger) setTimeout(() => inputRef.current?.focus(), 150);
  }, [focusTrigger]);

  return (
    <div class="border-border shrink-0 border-t px-3 pt-2 pb-2.5">
      <div class="border-border bg-muted/30 focus-within:border-accent/40 focus-within:bg-background flex items-end gap-1.5 rounded-2xl border px-3 py-2 transition-colors">
        <label class="sr-only" for="ai-chat-input">
          {label}
        </label>
        <textarea
          id="ai-chat-input"
          ref={inputRef}
          rows={1}
          value={value}
          onInput={e => {
            onInput((e.target as HTMLTextAreaElement).value);
            autoResize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={500}
          name="message"
          aria-label={label}
          autocomplete="off"
          class="text-foreground placeholder:text-foreground-soft min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[13px] leading-snug outline-none"
          style={{ maxHeight: "96px" }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || isStreaming || cooldown}
          aria-label={isStreaming ? sendingLabel : sendLabel}
          title={isStreaming ? sendingLabel : sendLabel}
          class="bg-accent text-background hover:bg-accent/90 mb-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isStreaming ? (
            <svg
              class="size-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              class="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export function resetInputHeight() {
  const el = document.getElementById(
    "ai-chat-input"
  ) as HTMLTextAreaElement | null;
  if (el) el.style.height = "auto";
}
