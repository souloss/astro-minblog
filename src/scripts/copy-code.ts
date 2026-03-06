function initCopyButtons() {
  const codeBlocks = document.querySelectorAll("pre:not(.copy-initialized)");

  codeBlocks.forEach(pre => {
    pre.classList.add("copy-initialized");

    const button = document.createElement("button");
    button.className = "copy-code-btn";
    button.setAttribute("aria-label", "Copy code");
    button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

    button.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      if (!code) return;

      const text = code.innerText;
      try {
        await navigator.clipboard.writeText(text);
        button.classList.add("copied");
        button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

        setTimeout(() => {
          button.classList.remove("copied");
          button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 2000);
      } catch {
        button.textContent = "Failed";
        setTimeout(() => {
          button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
        }, 2000);
      }
    });

    pre.appendChild(button);
  });
}

initCopyButtons();
document.addEventListener("astro:page-load", initCopyButtons);
