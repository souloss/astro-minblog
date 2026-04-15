import type { UIMessage } from "ai";

interface ToolResultPartLike {
  type?: string;
  toolCallId?: string;
  content?: unknown;
}

function isToolResultPart(part: unknown): boolean {
  if (typeof part !== "object" || part === null) {
    return false;
  }
  const candidate = part as ToolResultPartLike;
  return candidate.type === "tool-result";
}

/**
 * Determines whether `useChat` should automatically send a follow-up request
 * after client-side tool execution.
 *
 * In AI SDK v6, server-side tools with `execute` + `maxSteps` handle multi-step
 * internally — the LLM calls a tool, gets the result, and continues generating
 * all within one `streamText` call. No client-side auto-continue is needed.
 *
 * Client-side tools (action tools) are different: the server streams a tool-call
 * part and stops. The client executes the tool via `onToolCall`, then calls
 * `addToolOutput` which adds a `tool-result` part. This function detects those
 * `tool-result` parts and triggers auto-continue so the client sends the result
 * back to the server, allowing the LLM to generate follow-up text.
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

  // Auto-continue when there are client-side tool results (`tool-result` parts)
  // that need to be sent back to the server for the AI to generate follow-up text.
  // Server-side tools with `execute` + `maxSteps` handle multi-step internally,
  // so they never produce `tool-result` parts on the client.
  return parts.some(part => isToolResultPart(part));
}
