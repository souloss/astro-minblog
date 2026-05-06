/**
 * Directive client-side interactions for astro-minimax.
 *
 * Handles interactive behaviors for markdown directive components:
 * - Copy button (`.md-copy-btn`)
 * - Private/encrypt (`.md-directive-private`) — AES-256-CBC with PBKDF2
 * - Audio player (`.md-audio-player`)
 * - Voice player (`.md-audio-voice-player`)
 * - Video PiP (`.md-directive-video`)
 * - Tabs (`.md-directive-tabs`)
 * - GHCard (`.md-directive-ghcard`)
 */

import { getGlobalEventManager } from "../utils/performance";

// ── Shared State ──────────────────────────────────────────────────────────────

let activeAudio: HTMLAudioElement | null = null;
let activeVoice: HTMLAudioElement | null = null;

// ── Utility ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

// ── Copy Button ───────────────────────────────────────────────────────────────

const CHECK_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';

function initCopyButton(): void {
  const manager = getGlobalEventManager();

  manager.add(document, "click", (e: Event) => {
    const btn = (e.target as HTMLElement).closest(".md-copy-btn");
    if (!btn) return;

    let input: HTMLInputElement | HTMLTextAreaElement | HTMLElement | null =
      btn.parentElement?.querySelector(".md-copy-input") ?? null;
    if (!input && btn instanceof HTMLElement && btn.dataset.copyTarget) {
      input = document.getElementById(btn.dataset.copyTarget);
    }
    if (!input) return;

    const value =
      input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
        ? input.value
        : input.textContent ?? "";

    navigator.clipboard.writeText(value).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = CHECK_SVG;
      btn.classList.add("md-copy-success");
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove("md-copy-success");
      }, 1500);
    });
  });
}

// ── Private / Encrypt ─────────────────────────────────────────────────────────

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-CBC", length: 256 },
    false,
    ["decrypt"]
  );
}

async function decryptContent(
  payload: string,
  password: string
): Promise<string | null> {
  try {
    const data = base64ToBuffer(payload);
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 32);
    const ciphertext = data.slice(32);
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

function initPrivateDirective(): void {
  const manager = getGlobalEventManager();

  manager.add(document, "click", async (e: Event) => {
    const target = e.target as HTMLElement;

    // Toggle password visibility
    const toggle = target.closest(".md-private-toggle");
    if (toggle) {
      const container = toggle.closest(".md-directive-private");
      if (!container) return;
      const input = container.querySelector(".md-private-input") as HTMLInputElement | null;
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      toggle.classList.toggle("is-visible", input.type === "text");
      return;
    }

    // Decrypt button
    const btn = target.closest(".md-private-btn");
    if (btn) {
      const container = btn.closest(".md-directive-private");
      if (!container) return;
      const payload = (container as HTMLElement).dataset.payload;
      const input = container.querySelector(".md-private-input") as HTMLInputElement | null;
      const locked = container.querySelector(".md-private-locked") as HTMLElement | null;
      const unlocked = container.querySelector(".md-private-unlocked") as HTMLElement | null;
      const content = container.querySelector(".md-private-content") as HTMLElement | null;
      const error = container.querySelector(".md-private-error") as HTMLElement | null;
      if (!input || !payload) return;

      const password = input.value;
      if (!password) {
        input.focus();
        return;
      }

      const html = await decryptContent(payload, password);
      if (html !== null) {
        if (content) content.innerHTML = html;
        if (locked) locked.style.display = "none";
        if (unlocked) unlocked.style.display = "block";
        if (error) error.style.display = "none";
      } else {
        if (error) error.style.display = "block";
        input.value = "";
        input.focus();
      }
      return;
    }

    // Re-lock button
    const lockBtn = target.closest(".md-private-lock-btn");
    if (lockBtn) {
      const container = lockBtn.closest(".md-directive-private");
      if (!container) return;
      const locked = container.querySelector(".md-private-locked") as HTMLElement | null;
      const unlocked = container.querySelector(".md-private-unlocked") as HTMLElement | null;
      const content = container.querySelector(".md-private-content") as HTMLElement | null;
      const input = container.querySelector(".md-private-input") as HTMLInputElement | null;
      const error = container.querySelector(".md-private-error") as HTMLElement | null;
      if (content) content.innerHTML = "";
      if (unlocked) unlocked.style.display = "none";
      if (locked) locked.style.display = "flex";
      if (input) input.value = "";
      if (error) error.style.display = "none";
    }
  });

  // Enter key triggers decrypt
  manager.add(document, "keydown", (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter") return;
    const input = (ke.target as HTMLElement).closest(".md-private-input");
    if (!input) return;
    const container = input.closest(".md-directive-private");
    if (!container) return;
    const btn = container.querySelector(".md-private-btn") as HTMLElement | null;
    if (btn) btn.click();
  });
}

// ── Audio Player ──────────────────────────────────────────────────────────────

function setupAudioEvents(
  audioEl: HTMLAudioElement,
  playBtn: HTMLElement,
  pauseBtn: HTMLElement,
  progressFill: HTMLElement,
  timeCurrent: HTMLElement,
  timeTotal: HTMLElement
): void {
  if ((audioEl as HTMLAudioElement & { _inited?: boolean })._inited) return;
  (audioEl as HTMLAudioElement & { _inited?: boolean })._inited = true;

  audioEl.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = formatTime(audioEl.duration);
  });
  audioEl.addEventListener("timeupdate", () => {
    if (!audioEl.duration) return;
    const pct = audioEl.currentTime / audioEl.duration;
    progressFill.style.width = `${pct * 100}%`;
    timeCurrent.textContent = formatTime(audioEl.currentTime);
  });
  audioEl.addEventListener("ended", () => {
    playBtn.style.display = "inline-flex";
    pauseBtn.style.display = "none";
    progressFill.style.width = "0%";
    timeCurrent.textContent = "00:00";
    if (activeAudio === audioEl) activeAudio = null;
  });
}

function initAudioPlayer(): void {
  const manager = getGlobalEventManager();

  manager.add(document, "click", (e: Event) => {
    const target = e.target as HTMLElement;

    // ── Standard audio player ──
    const player = target.closest(".md-audio-player");
    if (player) {
      const container = player.closest(".md-directive-audio");
      if (!container) return;
      const audioEl = container.querySelector("audio") as HTMLAudioElement | null;
      const playBtn = player.querySelector(".md-audio-play") as HTMLElement | null;
      const pauseBtn = player.querySelector(".md-audio-pause") as HTMLElement | null;
      const progressBar = player.querySelector(".md-audio-progress-bar") as HTMLElement | null;
      const progressFill = player.querySelector(".md-audio-progress-fill") as HTMLElement | null;
      const timeCurrent = player.querySelector(".md-audio-time-current") as HTMLElement | null;
      const timeTotal = player.querySelector(".md-audio-time-total") as HTMLElement | null;
      if (!audioEl || !playBtn || !pauseBtn || !progressFill || !timeCurrent || !timeTotal) return;

      setupAudioEvents(audioEl, playBtn, pauseBtn, progressFill, timeCurrent, timeTotal);

      const clickedPlay = target.closest(".md-audio-btn");
      const clickedBar = target.closest(".md-audio-progress-bar");

      if (clickedPlay) {
        if (audioEl.paused) {
          if (activeAudio && activeAudio !== audioEl) activeAudio.pause();
          audioEl.play();
          playBtn.style.display = "none";
          pauseBtn.style.display = "inline-flex";
          activeAudio = audioEl;
        } else {
          audioEl.pause();
          playBtn.style.display = "inline-flex";
          pauseBtn.style.display = "none";
          if (activeAudio === audioEl) activeAudio = null;
        }
        return;
      }

      if (clickedBar && progressBar && audioEl.duration) {
        const rect = progressBar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e as MouseEvent).clientX - rect.left) / rect.width);
        audioEl.currentTime = pct * audioEl.duration;
        progressFill.style.width = `${pct * 100}%`;
      }
      return;
    }

    // ── Voice player ──
    const voicePlayer = target.closest(".md-audio-voice-player");
    if (voicePlayer) {
      const container = voicePlayer.closest(".md-directive-audio");
      if (!container) return;
      const src = (container as HTMLElement).dataset.src ?? "";
      const playIcon = voicePlayer.querySelector(".md-voice-icon-play") as HTMLElement | null;
      const pauseIcon = voicePlayer.querySelector(".md-voice-icon-pause") as HTMLElement | null;
      const canvas = voicePlayer.querySelector(".md-voice-wave") as HTMLCanvasElement | null;
      const duration = parseInt((container as HTMLElement).dataset.duration ?? "0", 10) || 0;

      if (!playIcon || !pauseIcon || !canvas) return;

      const voiceState = voicePlayer as HTMLElement & { _audio?: HTMLAudioElement };
      if (!voiceState._audio) {
        voiceState._audio = new Audio(src);
        voiceState._audio.addEventListener("ended", () => {
          playIcon.style.display = "inline-flex";
          pauseIcon.style.display = "none";
          if (activeVoice === voiceState._audio) activeVoice = null;
        });
        voiceState._audio.addEventListener("timeupdate", () => {
          const progress = voiceState._audio!.duration
            ? voiceState._audio!.currentTime / voiceState._audio!.duration
            : 0;
          drawVoiceWave(canvas, duration, true, progress);
        });
      }

      const audio = voiceState._audio;
      if (audio.paused) {
        if (activeVoice && activeVoice !== audio) activeVoice.pause();
        audio.play();
        playIcon.style.display = "none";
        pauseIcon.style.display = "inline-flex";
        activeVoice = audio;
        drawVoiceWave(canvas, duration, true, 0);
      } else {
        audio.pause();
        playIcon.style.display = "inline-flex";
        pauseIcon.style.display = "none";
        if (activeVoice === audio) activeVoice = null;
        drawVoiceWave(canvas, duration, false, 0);
      }
    }
  });

  // Autoplay support for inline audio players
  initInlineAudioAutoplay();
}

function initInlineAudioAutoplay(): void {
  document
    .querySelectorAll<HTMLDivElement>('.md-audio-player[data-autoplay="1"]')
    .forEach((player) => {
      const container = player.closest(".md-directive-audio");
      if (!container) return;
      const audioEl = container.querySelector("audio") as HTMLAudioElement | null;
      const playBtn = player.querySelector(".md-audio-play") as HTMLElement | null;
      const pauseBtn = player.querySelector(".md-audio-pause") as HTMLElement | null;
      const progressFill = player.querySelector(".md-audio-progress-fill") as HTMLElement | null;
      const timeCurrent = player.querySelector(".md-audio-time-current") as HTMLElement | null;
      const timeTotal = player.querySelector(".md-audio-time-total") as HTMLElement | null;
      if (!audioEl || !playBtn || !pauseBtn || !progressFill || !timeCurrent || !timeTotal) return;

      setupAudioEvents(audioEl, playBtn, pauseBtn, progressFill, timeCurrent, timeTotal);

      audioEl.play().then(() => {
        playBtn.style.display = "none";
        pauseBtn.style.display = "inline-flex";
        if (activeAudio && activeAudio !== audioEl) activeAudio.pause();
        activeAudio = audioEl;
      }).catch(() => {
        // Autoplay blocked by browser policy
      });
    });
}

// ── Voice Waveform Canvas ─────────────────────────────────────────────────────

function drawVoiceWave(
  canvas: HTMLCanvasElement,
  _duration: number,
  isPlaying: boolean,
  progress: number
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 160;
  const h = canvas.clientHeight || 24;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const bars = Math.floor(w / 5);
  const barW = 2;
  const gap = 3;

  const isDark =
    canvas.closest("[data-theme='dark']") !== null ||
    document.documentElement.classList.contains("dark");

  for (let i = 0; i < bars; i++) {
    const barH = 4 + Math.random() * (h - 8);
    const x = i * (barW + gap);
    const y = (h - barH) / 2;
    const barProgress = (x + barW / 2) / w;
    const isActive = isPlaying && barProgress <= progress;

    ctx.fillStyle = isActive
      ? "var(--accent-color, #4a7c59)"
      : isDark
        ? "rgba(255,255,255,0.15)"
        : "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 1);
    ctx.fill();
  }
}

// ── Video PiP ─────────────────────────────────────────────────────────────────

const PLAY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const BACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>';

let pipContainer: HTMLDivElement | null = null;
let pipVideo: HTMLVideoElement | null = null;
let pipOriginal: HTMLVideoElement | null = null;
let pipObserver: IntersectionObserver | null = null;

interface PipDragState {
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
}

let pipDragState: PipDragState | null = null;

function createPip(originalVideo: HTMLVideoElement): void {
  if (pipContainer) return;

  const src = originalVideo.currentSrc || originalVideo.src;
  const currentTime = originalVideo.currentTime;
  const wasPaused = originalVideo.paused;

  pipOriginal = originalVideo;
  originalVideo.pause();

  const uid = `md-pip-${originalVideo.id || "video"}`;

  pipContainer = document.createElement("div");
  pipContainer.className = "md-video-pip";
  pipContainer.id = uid;
  pipContainer.innerHTML =
    `<div class="md-pip-header" data-pip-drag="1">` +
    `<span class="md-pip-title">视频</span>` +
    `<button type="button" class="md-pip-back" title="回到原位" aria-label="回到原位">${BACK_SVG}</button>` +
    `<button type="button" class="md-pip-close" title="关闭" aria-label="关闭">×</button>` +
    `</div>` +
    `<div class="md-pip-video-wrap">` +
    `<video class="md-pip-video" src="${src}" preload="auto" playsinline></video>` +
    `</div>` +
    `<div class="md-pip-controls">` +
    `<button type="button" class="md-pip-play-btn" aria-label="播放">${wasPaused ? PLAY_SVG : PAUSE_SVG}</button>` +
    `<div class="md-pip-progress"><div class="md-pip-progress-fill"></div></div>` +
    `<span class="md-pip-time">00:00 / 00:00</span>` +
    `</div>`;

  document.body.appendChild(pipContainer);

  pipVideo = pipContainer.querySelector(".md-pip-video") as HTMLVideoElement;
  pipVideo.currentTime = currentTime;
  if (!wasPaused) pipVideo.play().catch(() => {});

  pipVideo.addEventListener("timeupdate", () => {
    if (pipOriginal) pipOriginal.currentTime = pipVideo!.currentTime;
    updatePipProgress();
  });
  pipVideo.addEventListener("play", updatePipPlayBtn);
  pipVideo.addEventListener("pause", updatePipPlayBtn);
  pipVideo.addEventListener("ended", () => {
    updatePipPlayBtn();
    if (pipOriginal) pipOriginal.currentTime = 0;
  });

  const playBtn = pipContainer.querySelector(".md-pip-play-btn") as HTMLButtonElement;
  playBtn.addEventListener("click", () => {
    if (!pipVideo) return;
    if (pipVideo.paused) {
      pipVideo.play().catch(() => {});
    } else {
      pipVideo.pause();
    }
  });

  const progressBar = pipContainer.querySelector(".md-pip-progress") as HTMLDivElement;
  progressBar.addEventListener("click", (e: MouseEvent) => {
    if (!pipVideo || !pipVideo.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    pipVideo.currentTime = pct * pipVideo.duration;
  });

  const backBtn = pipContainer.querySelector(".md-pip-back") as HTMLButtonElement;
  backBtn.addEventListener("click", () => {
    closePip(true);
  });

  const closeBtn = pipContainer.querySelector(".md-pip-close") as HTMLButtonElement;
  closeBtn.addEventListener("click", () => {
    closePip(false);
  });

  initPipDrag();
  updatePipProgress();
}

function updatePipProgress(): void {
  if (!pipContainer || !pipVideo) return;
  const fill = pipContainer.querySelector(".md-pip-progress-fill") as HTMLElement | null;
  const progressBar = pipContainer.querySelector(".md-pip-progress") as HTMLElement | null;
  const timeEl = pipContainer.querySelector(".md-pip-time") as HTMLElement | null;
  const duration = pipVideo.duration || 0;
  const current = pipVideo.currentTime || 0;

  if (duration) {
    const pct = (current / duration) * 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progressBar) progressBar.style.setProperty("--pip-progress-pct", `${pct}%`);
    if (timeEl) timeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  }
}

function updatePipPlayBtn(): void {
  if (!pipContainer || !pipVideo) return;
  const btn = pipContainer.querySelector(".md-pip-play-btn") as HTMLElement | null;
  if (btn) btn.innerHTML = pipVideo.paused ? PLAY_SVG : PAUSE_SVG;
}

function closePip(scrollBack: boolean): void {
  if (!pipContainer || !pipOriginal || !pipVideo) return;

  pipOriginal.currentTime = pipVideo.currentTime;
  const wasPlaying = !pipVideo.paused && !pipVideo.ended;

  pipContainer.remove();
  pipContainer = null;
  pipVideo = null;

  const orig = pipOriginal;
  pipOriginal = null;

  if (scrollBack) {
    orig.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      if (wasPlaying) orig.play().catch(() => {});
    }, 600);
  } else {
    if (wasPlaying) orig.play().catch(() => {});
  }
}

function initPipDrag(): void {
  if (!pipContainer) return;
  const header = pipContainer.querySelector(".md-pip-header") as HTMLElement | null;
  if (!header) return;

  header.addEventListener("mousedown", (e: MouseEvent) => {
    if (e.button !== 0) return;
    const rect = pipContainer!.getBoundingClientRect();
    pipDragState = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
    };
    pipContainer!.style.transition = "none";
    e.preventDefault();
  });
}

function initPipDragHandlers(): void {
  const manager = getGlobalEventManager();

  manager.add(document, "mousemove", (e: Event) => {
    const me = e as MouseEvent;
    if (!pipDragState || !pipContainer) return;
    const dx = me.clientX - pipDragState.startX;
    const dy = me.clientY - pipDragState.startY;
    let newLeft = pipDragState.startLeft + dx;
    let newTop = pipDragState.startTop + dy;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const elW = pipContainer.offsetWidth;
    const elH = pipContainer.offsetHeight;
    newLeft = Math.max(0, Math.min(winW - elW, newLeft));
    newTop = Math.max(0, Math.min(winH - elH, newTop));
    pipContainer.style.left = `${newLeft}px`;
    pipContainer.style.top = `${newTop}px`;
    pipContainer.style.right = "auto";
    pipContainer.style.bottom = "auto";
  });

  manager.add(document, "mouseup", () => {
    if (pipDragState && pipContainer) {
      pipDragState = null;
      pipContainer.style.transition = "";
    }
  });
}

function initVideoPip(): void {
  if (pipObserver) {
    pipObserver.disconnect();
  }

  pipObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        const pipMode = video.dataset.pipMode || "auto";
        if (pipMode === "off" || pipMode === "manual") return;

        if (!entry.isIntersecting && !video.paused && !pipContainer) {
          createPip(video);
        } else if (entry.isIntersecting && pipContainer && pipOriginal === video) {
          closePip(false);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll<HTMLVideoElement>("video[data-pip-video]").forEach((video) => {
    pipObserver!.observe(video);
  });
}

function initVideoDirective(): void {
  const manager = getGlobalEventManager();

  manager.add(document, "click", (e: Event) => {
    const target = e.target as HTMLElement;

    // Poster overlay play button
    const playBtn = target.closest("[data-video-play]");
    if (playBtn) {
      const container = playBtn.closest(".md-directive-video");
      if (!container) return;
      const overlay = container.querySelector(".md-video-overlay") as HTMLElement | null;
      const posterImg = container.querySelector(".md-video-poster-img") as HTMLElement | null;
      const video = container.querySelector(".md-video-element") as HTMLVideoElement | null;
      if (overlay) overlay.classList.add("is-hidden");
      if (posterImg) posterImg.style.display = "none";
      if (video) {
        video.classList.add("is-ready");
        video.setAttribute("controls", "");
        video.play().catch(() => {});
      }
      return;
    }

    // Manual PiP button
    const pipBtn = target.closest("[data-video-pip]");
    if (pipBtn) {
      const container = pipBtn.closest(".md-directive-video");
      if (!container) return;
      const video = container.querySelector(".md-video-element") as HTMLVideoElement | null;
      if (video && !pipContainer) {
        createPip(video);
      }
    }
  });

  initPipDragHandlers();
  initVideoPip();
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function initTabs(): void {
  document.querySelectorAll<HTMLElement>(".md-directive-tabs").forEach((container) => {
    if (container.dataset.tabsInitialized) return;
    container.dataset.tabsInitialized = "true";

    const nav = container.querySelector(".md-tabs-nav");
    const content = container.querySelector(".md-tabs-content");
    const buttons = nav
      ? Array.from(nav.querySelectorAll<HTMLButtonElement>(".md-tab-btn"))
      : [];
    const panes = content
      ? Array.from(content.children).filter((el) =>
          el.classList.contains("md-tab-pane")
        )
      : [];

    buttons.forEach((btn, idx) => {
      btn.addEventListener("click", (e: Event) => {
        e.preventDefault();
        buttons.forEach((b) => {
          b.classList.remove("md-tab-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("md-tab-active");
        btn.setAttribute("aria-selected", "true");
        panes.forEach((p) => p.classList.remove("md-tab-visible"));
        if (panes[idx]) panes[idx].classList.add("md-tab-visible");
      });
    });
  });
}

// ── GHCard ────────────────────────────────────────────────────────────────────

interface GhCardData {
  [key: string]: string | number | boolean | null | undefined;
}

function initGhCards(): void {
  document.querySelectorAll<HTMLElement>(".md-directive-ghcard").forEach((card) => {
    if (card.dataset.ghcardInitialized) return;
    card.dataset.ghcardInitialized = "true";

    const api = card.dataset.api;
    if (!api) return;

    // Show skeleton
    card.dataset.loading = "true";

    function fill(data: GhCardData): void {
      card.querySelectorAll("[data-key]").forEach((el) => {
        const key = (el as HTMLElement).dataset.key!;
        if (data[key] !== undefined && data[key] !== null) {
          if (el instanceof HTMLImageElement) {
            el.src = String(data[key]);
          } else {
            el.textContent = String(data[key]);
          }
        }
      });

      // If bio element doesn't exist but API returns bio, create it
      const bioEl = card.querySelector('[data-key="bio"]');
      if (!bioEl && data.bio) {
        const usernameEl = card.querySelector(".md-ghcard-username");
        if (usernameEl) {
          const p = document.createElement("p");
          p.className = "md-ghcard-bio";
          p.dataset.key = "bio";
          p.textContent = String(data.bio);
          usernameEl.parentNode?.insertBefore(p, usernameEl.nextSibling);
        }
      }
    }

    function fetchLatestTag(tagsApi: string): void {
      fetch(tagsApi)
        .then((res) => res.json())
        .then((tags: Array<{ name: string }>) => {
          if (Array.isArray(tags) && tags.length > 0) {
            const tagEl = card.querySelector('[data-key="latest-tag-name"]');
            if (tagEl) tagEl.textContent = tags[0].name;
          }
        })
        .catch(() => {
          // Tag fetch failed — non-critical
        });
    }

    fetch(api)
      .then((res) => res.json())
      .then((data: GhCardData) => {
        fill(data);
        const tagsApi = card.dataset.tagsApi;
        if (tagsApi) {
          fetchLatestTag(tagsApi);
        }
      })
      .then(() => {
        delete card.dataset.loading;
      })
      .catch(() => {
        delete card.dataset.loading;
      });
  });
}

// ── Main Init ─────────────────────────────────────────────────────────────────

function initDirectiveInteractions(): void {
  initCopyButton();
  initPrivateDirective();
  initAudioPlayer();
  initVideoDirective();
  initTabs();
  initGhCards();
}

document.addEventListener("astro:page-load", initDirectiveInteractions);
