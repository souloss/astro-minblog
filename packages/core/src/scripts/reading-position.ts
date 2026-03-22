import { getGlobalEventManager, rafThrottle } from "../utils/performance";

const STORAGE_KEY = "reading-positions";
const MAX_ENTRIES = 50;

interface ReadingEntry {
  scrollY: number;
  ts: number;
}

function getPositions(): Record<string, ReadingEntry> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePosition(path: string, scrollY: number) {
  const positions = getPositions();
  positions[path] = { scrollY, ts: Date.now() };

  const keys = Object.keys(positions);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => positions[a].ts - positions[b].ts);
    for (let i = 0; i < keys.length - MAX_ENTRIES; i++) {
      delete positions[sorted[i]];
    }
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

function initReadingPosition() {
  const article = document.getElementById("article");
  if (!article) return;

  const path = window.location.pathname;
  const positions = getPositions();
  const entry = positions[path];

  if (entry && entry.scrollY > 100) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: entry.scrollY, behavior: "instant" });
    });
  }

  const manager = getGlobalEventManager();
  const throttledSave = rafThrottle(() => savePosition(path, window.scrollY));
  manager.add(document, "scroll", throttledSave, { passive: true });
}

document.addEventListener("astro:page-load", initReadingPosition);
