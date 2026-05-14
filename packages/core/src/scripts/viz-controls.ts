import { getGlobalEventManager } from "../utils/performance";

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

export function initVizContainers() {
  document.querySelectorAll<HTMLElement>(".viz-container").forEach(container => {
    if (container.dataset.vizCtrlInit === "initialized") return;

    const viewport = container.querySelector<HTMLElement>(".viz-viewport");
    if (!viewport) return;

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

    /**
     * Check if the container is currently showing code view
     * (has a visible code-view element and hidden viewport content)
     */
    function isCodeViewActive(): boolean {
      const codeView = container.querySelector(".mermaid-code-view, .markmap-code-view");
      if (!codeView) return false;
      return !codeView.classList.contains("hidden");
    }

    const zoomInBtn = container.querySelector(".viz-zoom-in");
    if (zoomInBtn) {
      addTrackedListener(zoomInBtn, "click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        scale = Math.min(MAX_SCALE, scale + ZOOM_STEP);
        applyTransform();
      });
    }

    const zoomOutBtn = container.querySelector(".viz-zoom-out");
    if (zoomOutBtn) {
      addTrackedListener(zoomOutBtn, "click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        scale = Math.max(MIN_SCALE, scale - ZOOM_STEP);
        applyTransform();
      });
    }

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

    if (container.dataset.vizZoom === "true") {
      addTrackedListener(container, "wheel", (e: Event) => {
        // Don't intercept wheel events when code view is active — let normal scrolling work
        if (isCodeViewActive()) return;

        const wheelEvent = e as WheelEvent;
        const isZoomIntent = wheelEvent.ctrlKey || wheelEvent.metaKey || wheelEvent.deltaMode === 0;
        if (!isZoomIntent) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = wheelEvent.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
        applyTransform();
      }, { passive: false });

      let isPanning = false;
      let startX = 0;
      let startY = 0;

      addTrackedListener(container, "mousedown", (e: Event) => {
        // Don't start panning when code view is active
        if (isCodeViewActive()) return;

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

    const fsBtn = container.querySelector<HTMLElement>(".viz-fullscreen");
    if (fsBtn && container.dataset.vizFullscreen === "true") {
      const enterIcon = fsBtn.querySelector(".viz-fs-enter");
      const exitIcon = fsBtn.querySelector(".viz-fs-exit");

      addTrackedListener(fsBtn, "click", (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.fullscreenElement === container) {
          document.exitFullscreen().catch(() => {});
        } else {
          container.requestFullscreen().catch(() => {});
        }
      });

      const handleFullscreenChange = () => {
        const isFs = document.fullscreenElement === container;
        if (isFs) {
          enterIcon?.classList.add("hidden");
          exitIcon?.classList.remove("hidden");
          container.style.background = "var(--background)";
          container.classList.add("p-4");

          // When in fullscreen with code view active, hide the viewport
          // and let the code view fill the entire fullscreen area
          if (isCodeViewActive()) {
            viewport.style.display = "none";
            const codeView = container.querySelector<HTMLElement>(".mermaid-code-view, .markmap-code-view");
            if (codeView) {
              codeView.style.maxHeight = "none";
              codeView.style.flex = "1";
              codeView.style.minHeight = "0";
            }
          }
        } else {
          enterIcon?.classList.remove("hidden");
          exitIcon?.classList.add("hidden");
          container.style.background = "";
          container.classList.remove("p-4");

          // Restore viewport visibility and code view constraints
          viewport.style.display = "";
          const codeView = container.querySelector<HTMLElement>(".mermaid-code-view, .markmap-code-view");
          if (codeView) {
            codeView.style.maxHeight = "";
            codeView.style.flex = "";
            codeView.style.minHeight = "";
          }
        }
      };

      // fullscreenchange 事件应该绑定到 document 而不是 container
      addTrackedListener(document, "fullscreenchange", handleFullscreenChange);
    }
  });
}

const manager = getGlobalEventManager();
manager.onCleanup(cleanupListeners);