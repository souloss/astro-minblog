import type { UIMessage } from "ai";

const AUTO_CONTINUE_TOOL_NAMES = new Set(["searchArticles"]);

interface ToolPartLike {
  type?: string;
  state?: string;
  toolCallId?: string;
}

interface ToolResultPartLike {
  type?: string;
  toolCallId?: string;
  content?: unknown;
}

function isCompletedToolPart(part: unknown): boolean {
  if (typeof part !== "object" || part === null) {
    return false;
  }

  const candidate = part as ToolPartLike;
  return (
    typeof candidate.type === "string" &&
    candidate.type.startsWith("tool-") &&
    candidate.state === "output-available"
  );
}

function isToolResultPart(part: unknown): boolean {
  if (typeof part !== "object" || part === null) {
    return false;
  }
  const candidate = part as ToolResultPartLike;
  return candidate.type === "tool-result";
}

function getToolName(part: ToolPartLike): string | null {
  if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
    return null;
  }

  return part.type.slice("tool-".length) || null;
}

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

  // Collect toolCallIds that already have results available.
  // Two sources of "completed" results:
  //   1. `tool-result` parts — added client-side via addToolOutput (client-side tools)
  //   2. `tool-*` parts with state `output-available` — server-side tools whose `execute`
  //      was already run by AI SDK's streamText multi-step internally.
  // For case 2 the LLM has already continued generating, so auto-continue MUST NOT fire
  // (otherwise the user sees a duplicate second response).
  const completedToolCallIds = new Set<string>();
  for (const part of parts) {
    // Client-side tool results
    if (isToolResultPart(part)) {
      const resultPart = part as ToolResultPartLike;
      if (resultPart.toolCallId) {
        completedToolCallIds.add(resultPart.toolCallId);
      }
    }
    // Server-side tools with execute — output-available means the result is already
    // embedded in the tool part and the LLM has already produced its follow-up.
    if (isCompletedToolPart(part)) {
      const toolPart = part as ToolPartLike;
      if (toolPart.toolCallId) {
        completedToolCallIds.add(toolPart.toolCallId);
      }
    }
  }

  // Only auto-continue for a tool that is in AUTO_CONTINUE_TOOL_NAMES and does NOT
  // yet have a result. Since server-side tools with execute are already added above,
  // this will return false for them, preventing the duplicate-response bug.
  return parts.some(part => {
    if (!isCompletedToolPart(part)) {
      return false;
    }

    const toolPart = part as ToolPartLike;
    const toolName = toolPart.toolCallId ? getToolName(toolPart) : null;

    // Don't auto-continue if this tool call already has a result
    if (toolPart.toolCallId && completedToolCallIds.has(toolPart.toolCallId)) {
      return false;
    }

    return toolName ? AUTO_CONTINUE_TOOL_NAMES.has(toolName) : false;
  });
}
