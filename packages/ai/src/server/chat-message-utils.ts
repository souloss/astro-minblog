import type { UIMessage } from 'ai';

export function getMessageText(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map(p => p.text)
      .join('');
  }
  return '';
}

export function hasContent(message: UIMessage): boolean {
  const text = getMessageText(message);
  if (text.trim()) return true;
  if (Array.isArray(message.parts)) {
    return message.parts.some(p => p.type !== 'text');
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
    if (msg?.role !== 'user') continue;
    const text = getMessageText(msg);
    if (text.trim()) return text;
  }
  return '';
}
