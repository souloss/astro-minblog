import type { UIMessage } from "ai";
import { estimateTokens } from "../utils/text.js";

/**
 * Extracts text content from a message's parts array.
 * Accepts any object with an optional `parts` field for broad compatibility.
 */
export function getMessageText(message: {
  parts?: Array<{ type: string; text?: string }>;
}): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map(p => p.text)
      .join("");
  }
  return "";
}

export function hasContent(message: UIMessage): boolean {
  const text = getMessageText(message);
  if (text.trim()) return true;
  if (Array.isArray(message.parts)) {
    return message.parts.some(p => p.type !== "text");
  }
  return false;
}

export function filterValidMessages(messages: UIMessage[]): UIMessage[] {
  const filtered: UIMessage[] = [];
  let lastRole: string | null = null;

  for (const msg of messages) {
    if (!hasContent(msg)) continue;
    if (msg.role === lastRole) continue;
    filtered.push(msg);
    lastRole = msg.role;
  }

  return filtered;
}

export function getLatestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== "user") continue;
    const text = getMessageText(msg);
    if (text.trim()) return text;
  }
  return "";
}

export interface MessageTokenBudget {
  usedTokens: number;
  wasTrimmed: boolean;
}

export function trimMessagesToTokenBudget(
  messages: UIMessage[],
  maxTokens: number
): { messages: UIMessage[]; budget: MessageTokenBudget } {
  if (!messages.length) {
    return { messages: [], budget: { usedTokens: 0, wasTrimmed: false } };
  }

  const tokensPerMessage = messages.map(m => estimateTokens(getMessageText(m)));
  const totalTokens = tokensPerMessage.reduce((sum, t) => sum + t, 0);

  if (totalTokens <= maxTokens) {
    return {
      messages,
      budget: { usedTokens: totalTokens, wasTrimmed: false },
    };
  }

  if (messages.length <= 2) {
    return {
      messages,
      budget: { usedTokens: totalTokens, wasTrimmed: false },
    };
  }

  let usedTokens = tokensPerMessage[0] + tokensPerMessage[messages.length - 1];
  const kept: UIMessage[] = [messages[0]];

  const recentMessages: UIMessage[] = [];
  for (let i = messages.length - 1; i > 0; i--) {
    const msgTokens = tokensPerMessage[i];
    if (usedTokens + msgTokens > maxTokens) break;
    recentMessages.unshift(messages[i]);
    usedTokens += msgTokens;
  }

  const result: UIMessage[] = [...kept, ...recentMessages];
  const filtered = filterValidMessages(result);

  const finalTokens = filtered
    .map(m => estimateTokens(getMessageText(m)))
    .reduce((sum, t) => sum + t, 0);

  return {
    messages: filtered,
    budget: { usedTokens: finalTokens, wasTrimmed: true },
  };
}
