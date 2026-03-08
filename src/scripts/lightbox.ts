function initLightbox() {
  const article = document.getElementById("article");
  if (!article) return;

  let overlay: HTMLDivElement | null = null;

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Image preview");
    overlay.innerHTML = `
      <button id="lightbox-close" aria-label="Close" class="lightbox-close">&times;</button>
      <img id="lightbox-img" src="" alt="" />
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => {
      if (
        e.target === overlay ||
        (e.target as HTMLElement).id === "lightbox-close"
      ) {
        close();
      }
    });

    return overlay;
  }

  function open(src: string, alt: string) {
    const el = createOverlay();
    const img = el.querySelector("#lightbox-img") as HTMLImageElement;
    img.src = src;
    img.alt = alt;
    el.classList.add("active");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  const images = article.querySelectorAll("img");
  images.forEach(img => {
    if (img.closest("a")) return;
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => {
      open(img.src, img.alt || "");
    });
  });
}

document.addEventListener("astro:page-load", initLightbox);
