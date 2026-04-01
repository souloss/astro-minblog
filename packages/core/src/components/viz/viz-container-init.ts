import { getGlobalEventManager } from "../../utils/performance";

const trackedListeners: Array<{
  target: EventTarget;
  type: string;
  handler: EventListenerOrEventListenerObject;
  options?: AddEventListenerOptions | boolean;
}> = [];

function addTrackedListener(
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean
) {
  target.addEventListener(type, handler, options);
  trackedListeners.push({ target, type, handler, options });
}

function cleanupListeners() {
  for (const { target, type, handler, options } of trackedListeners) {
    target.removeEventListener(type, handler, options);
  }
  trackedListeners.length = 0;
}

function initVizContainers() {
  document.querySelectorAll<HTMLElement>(".viz-container").forEach(container => {
    // Skip if already initialized - use a flag on the container itself
    if (container.dataset.vizCtrlInit === "initialized") return;

    const viewport = container.querySelector<HTMLElement>(".viz-viewport");
    if (!viewport) return;

    // Mark as being initialized to prevent duplicate processing
    container.dataset.vizCtrlInit = "initialized";

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    const MIN_SCALE = 0.3;
    const MAX_SCALE = 5;
    const ZOOM_STEP = 0.2;

    function applyTransform() {
      viewport!.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    }

    // Zoom In Button
    const zoomInBtn = container.querySelector(".viz-zoom-in");
    if (zoomInBtn) {
      addTrackedListener(zoomInBtn, "click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        scale = Math.min(MAX_SCALE, scale + ZOOM_STEP);
        applyTransform();
      });
    }

    // Zoom Out Button
    const zoomOutBtn = container.querySelector(".viz-zoom-out");
    if (zoomOutBtn) {
      addTrackedListener(zoomOutBtn, "click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        scale = Math.max(MIN_SCALE, scale - ZOOM_STEP);
        applyTransform();
      });
    }

    // Reset Button
    const resetBtn = container.querySelector(".viz-reset");
    if (resetBtn) {
      addTrackedListener(resetBtn, "click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        scale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform();
      });
    }

    // Wheel Zoom (if zoom is enabled)
    if (container.dataset.vizZoom === "true") {
      addTrackedListener(container, "wheel", (e: Event) => {
        const wheelEvent = e as WheelEvent;
        const isZoomIntent = wheelEvent.ctrlKey || wheelEvent.metaKey || wheelEvent.deltaMode === 0;
        if (!isZoomIntent) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = wheelEvent.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
        applyTransform();
      }, { passive: false });

      // Pan functionality
      let isPanning = false;
      let startX = 0;
      let startY = 0;

      addTrackedListener(container, "mousedown", (e: Event) => {
        const mouseEvent = e as MouseEvent;
        if (!mouseEvent.shiftKey && mouseEvent.button !== 1) return;
        e.preventDefault();
        isPanning = true;
        startX = mouseEvent.clientX;
        startY = mouseEvent.clientY;
        container.style.cursor = "grabbing";
      });

      addTrackedListener(window, "mousemove", (e: Event) => {
        if (!isPanning) return;
        const mouseEvent = e as MouseEvent;
        translateX += (mouseEvent.clientX - startX) / scale;
        translateY += (mouseEvent.clientY - startY) / scale;
        startX = mouseEvent.clientX;
        startY = mouseEvent.clientY;
        applyTransform();
      });

      addTrackedListener(window, "mouseup", () => {
        if (!isPanning) return;
        isPanning = false;
        container.style.cursor = "";
      });
    }

    // Fullscreen Button (if fullscreen is enabled)
    const fsBtn = container.querySelector<HTMLElement>(".viz-fullscreen");
    if (fsBtn && container.dataset.vizFullscreen === "true") {
      const enterIcon = fsBtn.querySelector(".viz-fs-enter");
      const exitIcon = fsBtn.querySelector(".viz-fs-exit");

      addTrackedListener(fsBtn, "click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.fullscreenElement === container) {
          document.exitFullscreen().catch(() => { });
        } else {
          container.requestFullscreen().catch(() => { });
        }
      });

      const handleFullscreenChange = () => {
        const isFs = document.fullscreenElement === container;
        if (isFs) {
          enterIcon?.classList.add("hidden");
          exitIcon?.classList.remove("hidden");
          container.style.background = "var(--background)";
          container.classList.add("p-4");
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.dispatchEvent(new CustomEvent("viz:fullscreen-enter", { detail: container }));
            });
          });
        } else {
          enterIcon?.classList.remove("hidden");
          exitIcon?.classList.add("hidden");
          container.style.background = "";
          container.classList.remove("p-4");
        }
      };

      // fullscreenchange 事件应该绑定到 document 而不是 container
      addTrackedListener(document, "fullscreenchange", handleFullscreenChange);
    }
  });
}

const manager = getGlobalEventManager();
manager.onCleanup(cleanupListeners);

export function ensureVizInit() {
  document.addEventListener("astro:page-load", initVizContainers);
  window.addEventListener("viz:init", initVizContainers);
  return { initVizContainers };
}
