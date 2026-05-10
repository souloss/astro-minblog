import type { UIMessage } from "ai";

const ACTION_TOOL_NAMES = new Set([
  "toggleTheme",
  "navigateToArticle",
  "scrollToSection",
  "toggleImmersiveMode",
  "toggleReadingMode",
  "highlightText",
  "setPreference",
]);

/**
 * Determines whether `useChat` should automatically send a follow-up request
 * after client-side tool execution.
 *
 * In AI SDK v6, server-side tools with `execute` handle multi-step internally
 * — the LLM calls a tool, gets the result, and continues generating all within
 * one `streamText` call. No client-side auto-continue is needed for those.
 *
 * Client-side tools (action tools) are different: the server streams a tool-call
 * part and stops. The client executes the tool via `onToolCall`, then calls
 * `addToolOutput` which updates the tool part to `state: "output-available"`.
 * This function detects those completed action tool parts and triggers
 * auto-continue so the client sends the result back to the server, allowing
 * the LLM to generate follow-up text.
 */
export function shouldAutoContinueAfterToolCalls({
  messages,
}: {
  messages: UIMessage[];
}): boolean {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") {
    return false;
  }

  const parts = Array.isArray(lastMessage.parts) ? lastMessage.parts : [];

  // Auto-continue when there are client-side action tool parts with
  // output-available state. After onToolCall + addToolOutput, the tool part
  // transitions from state "input-streaming" to "output-available".
  // Server-side tools (e.g., searchArticles) handle execution internally
  // and never produce output-available parts on the client.
  return parts.some((part: { type?: string; state?: string }) => {
    if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
      return false;
    }
    const toolName = part.type.slice("tool-".length);
    return ACTION_TOOL_NAMES.has(toolName) && part.state === "output-available";
  });
}
