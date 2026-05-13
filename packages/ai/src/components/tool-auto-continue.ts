import type { UIMessage } from "ai";

/**
 * Client-side action tools that require client execution and auto-continue.
 * These tools have no `execute` function on the server side.
 */
const ACTION_TOOL_NAMES = new Set(["toggleTheme", "navigateToArticle"]);

/** Maximum number of auto-continue iterations to prevent infinite loops. */
const MAX_AUTO_CONTINUE_ITERATIONS = 2;

/**
 * Determines whether the chat should automatically continue after tool execution.
 *
 * This is used as the `sendAutomaticallyWhen` callback for `useChat`.
 * It triggers a follow-up request when client-side action tools have been executed,
 * allowing the model to generate a response based on the tool results.
 *
 * A maximum iteration limit prevents infinite loops where the model repeatedly
 * calls client-side action tools in follow-up responses.
 */
export function shouldAutoContinueAfterToolCalls({
  messages,
}: {
  messages: UIMessage[];
}): boolean {
  // Count how many assistant messages already contain action tool outputs
  // to prevent infinite auto-continue loops.
  let actionToolOutputCount = 0;
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (
        typeof part.type === "string" &&
        part.type.startsWith("tool-") &&
        ACTION_TOOL_NAMES.has(part.type.slice("tool-".length)) &&
        (part as { state?: string }).state === "output-available"
      ) {
        actionToolOutputCount++;
      }
    }
  }

  if (actionToolOutputCount >= MAX_AUTO_CONTINUE_ITERATIONS) {
    return false;
  }

  // Check if the last message has action tool outputs that need a follow-up
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") {
    return false;
  }

  return lastMessage.parts.some(
    (part: { type?: string; state?: string }) => {
      if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
        return false;
      }
      const toolName = part.type.slice("tool-".length);
      return ACTION_TOOL_NAMES.has(toolName) && part.state === "output-available";
    }
  );
}
