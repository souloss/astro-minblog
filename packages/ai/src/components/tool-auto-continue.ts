import type { UIMessage } from "ai";

const AUTO_CONTINUE_TOOL_NAMES = new Set(["searchArticles"]);
const MAX_AUTO_CONTINUE_PER_SESSION = 3;
let autoContinueCountThisSession = 0;

const FALLBACK_ERROR_PATTERNS = [
  "抱歉，我无法生成有效的回答",
  "抱歉，我目前无法完成",
  "无法生成有效的回答",
  "请尝试换一种方式提问",
  "Thanks for asking",
  "I'm in Demo mode",
  "can recommend blog articles",
];

function isFallbackError(text: string): boolean {
  return FALLBACK_ERROR_PATTERNS.some(pattern => text.includes(pattern));
}

interface ToolPartLike {
  type?: string;
  state?: string;
}

function isCompletedToolPart(part: unknown): boolean {
  if (typeof part !== "object" || part === null) return false;
  const candidate = part as ToolPartLike;
  return (
    typeof candidate.type === "string" &&
    candidate.type.startsWith("tool-") &&
    candidate.state === "output-available"
  );
}

function getToolName(part: ToolPartLike): string | null {
  if (typeof part.type !== "string" || !part.type.startsWith("tool-")) return null;
  return part.type.slice("tool-".length) || null;
}

function getMessageText(msg: UIMessage): string {
  const parts = msg.parts ?? [];
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map(p => p.text)
    .join("");
}

export function resetAutoContinueCount(): void {
  autoContinueCountThisSession = 0;
}

export function shouldAutoContinueAfterToolCalls({
  messages,
}: {
  messages: UIMessage[];
}): boolean {
  if (autoContinueCountThisSession >= MAX_AUTO_CONTINUE_PER_SESSION) {
    return false;
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "assistant") {
    return false;
  }

  const lastText = getMessageText(lastMessage);

  if (isFallbackError(lastText)) {
    return false;
  }

  const recentFallbackCount = messages
    .slice(-5)
    .filter(m => {
      if (m.role !== "assistant") return false;
      const text = getMessageText(m);
      return isFallbackError(text);
    }).length;

  if (recentFallbackCount >= 2) {
    return false;
  }

  const parts = Array.isArray(lastMessage.parts) ? lastMessage.parts : [];
  const hasAutoContinueTool = parts.some(part => {
    if (!isCompletedToolPart(part)) return false;
    const toolName = getToolName(part);
    return toolName ? AUTO_CONTINUE_TOOL_NAMES.has(toolName) : false;
  });

  if (hasAutoContinueTool) {
    autoContinueCountThisSession++;
  }

  return hasAutoContinueTool;
}
