import type { UIMessage } from "ai";

const AUTO_CONTINUE_TOOL_NAMES = new Set(["searchArticles"]);

interface ToolPartLike {
  type?: string;
  state?: string;
}

function isCompletedToolPart(part: unknown): boolean {
  if (typeof part !== "object" || part === null) {
    return false;
  }

  const candidate = part as ToolPartLike;
  return typeof candidate.type === "string"
    && candidate.type.startsWith("tool-")
    && candidate.state === "output-available";
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
  return parts.some(part => {
    if (!isCompletedToolPart(part)) {
      return false;
    }

    const toolName = getToolName(part);
    return toolName ? AUTO_CONTINUE_TOOL_NAMES.has(toolName) : false;
  });
}
