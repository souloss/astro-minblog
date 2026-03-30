import type { Action, QueuedActionItem } from "./types";

const QUEUE_KEY = "ai_action_queue";
const DEFAULT_EXPIRY_MS = 60_000;

export const ActionQueue = {
  generateId(): string {
    return `act_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  },

  getQueue(): QueuedActionItem[] {
    if (typeof window === "undefined") return [];

    try {
      const raw = sessionStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setQueue(queue: QueuedActionItem[]): void {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn("[ActionQueue] Failed to save:", e);
    }
  },

  enqueue(actions: Action[], expiryMs: number = DEFAULT_EXPIRY_MS): string {
    const id = this.generateId();
    const now = Date.now();

    const queue = this.getQueue();
    const cleaned = queue.filter(item => item.expiresAt > now);

    cleaned.push({
      id,
      actions,
      createdAt: now,
      expiresAt: now + expiryMs,
    });

    this.setQueue(cleaned);

    return id;
  },

  dequeue(id: string): Action[] | null {
    const queue = this.getQueue();
    const index = queue.findIndex(item => item.id === id);

    if (index === -1) {
      console.warn("[ActionQueue] Action not found:", id);
      return null;
    }

    const item = queue[index];

    if (item.expiresAt < Date.now()) {
      queue.splice(index, 1);
      this.setQueue(queue);
      console.warn("[ActionQueue] Action expired:", id);
      return null;
    }

    queue.splice(index, 1);
    this.setQueue(queue);

    return item.actions;
  },

  cleanup(): void {
    const queue = this.getQueue();
    const now = Date.now();
    const cleaned = queue.filter(item => item.expiresAt > now);

    if (cleaned.length !== queue.length) {
      this.setQueue(cleaned);
    }
  },

  clear(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(QUEUE_KEY);
  },
};

if (typeof window !== "undefined") {
  window.__actionQueue = ActionQueue;
}
