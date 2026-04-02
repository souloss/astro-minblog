import type { UIMessage } from "ai";

const AUTO_CONTINUE_TOOL_NAMES = new Set(["searchArticles"]);

// Fallback error patterns - do NOT auto-continue when these appear
const FALLBACK_ERROR_PATTERNS = [
  "抱歉，我无法生成有效的回答",
  "抱歉，我目前无法完成",
  "无法生成有效的回答",
  "请尝试换一种方式提问",
  "Thanks for asking",
  "I'm in Demo mode",
  "can recommend blog articles",
];

// Check if text contains fallback error
function isFallbackError(text: string): boolean {
  return FALLBACK_ERROR_PATTERNS.some(pattern => text.includes(pattern));
}

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

// Get text content from message parts
function getMessageText(msg: UIMessage): string {
  const parts = msg.parts ?? [];
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map(p => p.text)
    .join("");
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

  const lastText = getMessageText(lastMessage);

  // Do NOT auto-continue if last message is a fallback error
  if (isFallbackError(lastText)) {
    return false;
  }

  // Do NOT auto-continue if we detect a loop pattern:
  // Count recent "sorry/fallback" messages
  const recentFallbackCount = messages
    .slice(-5)
    .filter(m => {
      if (m.role !== "assistant") return false;
      const text = getMessageText(m);
      return isFallbackError(text);
    }).length;

  // If 2+ recent messages were fallback errors, we're in a loop
  if (recentFallbackCount >= 2) {
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
