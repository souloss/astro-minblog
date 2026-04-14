/**
 * Tool action mapping for AI SDK onToolCall handler.
 * Maps tool names from the LLM to action objects consumed by ActionExecutor.
 */

export interface ToolAction {
  type: string;
  payload: Record<string, unknown>;
}

type ToolMapper = (input: Record<string, unknown>) => ToolAction;

export const TOOL_ACTION_MAP: Record<string, ToolMapper> = {
  toggleTheme: i => ({ type: "toggle-theme", payload: { theme: i.theme } }),
  navigateToArticle: i => ({
    type: "navigate",
    payload: {
      slug: i.slug,
      lang: (i.lang as string) || "zh",
      then: i.sectionId
        ? [{ type: "scroll-to-section", payload: { sectionId: i.sectionId } }]
        : undefined,
    },
  }),
  scrollToSection: i => ({
    type: "scroll-to-section",
    payload: {
      sectionId: i.sectionId,
      highlight: i.highlight ?? true,
      behavior: i.behavior ?? "smooth",
    },
  }),
  toggleReadingMode: i => ({
    type: "toggle-reading-mode",
    payload: {
      enabled: i.enabled,
      settings: {
        ...(i.fontSize ? { fontSize: i.fontSize } : {}),
        ...(i.fontFamily ? { fontFamily: i.fontFamily } : {}),
      },
    },
  }),
  highlightText: i => ({
    type: "highlight-text",
    payload: {
      text: i.text,
      selector: i.selector,
      style: i.style ?? "accent",
      duration: i.duration ?? 3000,
      scrollIntoView: i.scrollIntoView ?? false,
    },
  }),
  setPreference: i => ({
    type: "set-preference",
    payload: { key: i.key, value: i.value },
  }),
};

export function buildToolAction(
  toolName: string,
  input: Record<string, unknown>
): ToolAction | null {
  const mapper = TOOL_ACTION_MAP[toolName];
  return mapper ? mapper(input) : null;
}
