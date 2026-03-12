/**
 * VizContainer control initialization - zoom, pan, fullscreen.
 * Must be loaded whenever viz-containers exist on the page, including:
 * - Astro-rendered components (VizContainer.astro)
 * - Dynamically created containers (e.g. markmap-renderer's buildVizShell)
 */

function initVizContainers() {
  document.querySelectorAll<HTMLElement>(".viz-container").forEach(container => {
    if (container.dataset.vizCtrlInit) return;
    container.dataset.vizCtrlInit = "true";

    const viewport = container.querySelector<HTMLElement>(".viz-viewport");
    if (!viewport) return;

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    const MIN_SCALE = 0.3;
    const MAX_SCALE = 5;
    const ZOOM_STEP = 0.2;

    function applyTransform() {
      viewport!.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    }

    container.querySelector(".viz-zoom-in")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      scale = Math.min(MAX_SCALE, scale + ZOOM_STEP);
      applyTransform();
    });

    container.querySelector(".viz-zoom-out")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      scale = Math.max(MIN_SCALE, scale - ZOOM_STEP);
      applyTransform();
    });

    container.querySelector(".viz-reset")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    });

    if (container.dataset.vizZoom === "true") {
      container.addEventListener("wheel", (e: WheelEvent) => {
        // 支持 Ctrl/Cmd+滚轮 或 触摸板双指缩放手势（通常带 ctrlKey）
        const isZoomIntent = e.ctrlKey || e.metaKey || e.deltaMode === 0;
        if (!isZoomIntent) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
        applyTransform();
      }, { passive: false });

      let isPanning = false;
      let startX = 0;
      let startY = 0;

      container.addEventListener("mousedown", (e: MouseEvent) => {
        if (!e.shiftKey && e.button !== 1) return;
        e.preventDefault();
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        container.style.cursor = "grabbing";
      });

      window.addEventListener("mousemove", (e: MouseEvent) => {
        if (!isPanning) return;
        translateX += (e.clientX - startX) / scale;
        translateY += (e.clientY - startY) / scale;
        startX = e.clientX;
        startY = e.clientY;
        applyTransform();
      });

      window.addEventListener("mouseup", () => {
        if (!isPanning) return;
        isPanning = false;
        container.style.cursor = "";
      });
    }

    const fsBtn = container.querySelector<HTMLElement>(".viz-fullscreen");
    if (fsBtn && container.dataset.vizFullscreen === "true") {
      const enterIcon = fsBtn.querySelector(".viz-fs-enter");
      const exitIcon = fsBtn.querySelector(".viz-fs-exit");

      fsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.fullscreenElement === container) {
          document.exitFullscreen();
        } else {
          container.requestFullscreen().catch(() => {});
        }
      });

      container.addEventListener("fullscreenchange", () => {
        const isFs = document.fullscreenElement === container;
        enterIcon?.classList.toggle("hidden", isFs);
        exitIcon?.classList.toggle("hidden", !isFs);
        if (isFs) {
          container.style.background = "var(--background)";
          container.classList.add("p-4");
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.dispatchEvent(new CustomEvent("viz:fullscreen-enter", { detail: container }));
            });
          });
        } else {
          container.style.background = "";
          container.classList.remove("p-4");
        }
      });
    }
  });
}

initVizContainers();
document.addEventListener("astro:page-load", initVizContainers);
window.addEventListener("viz:init", initVizContainers);
