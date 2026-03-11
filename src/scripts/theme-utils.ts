export function getIsDark(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function onThemeChange(
  callback: (isDark: boolean) => void
): () => void {
  const handler = (e: CustomEvent<ThemeChangeDetail>) => {
    callback(e.detail.isDark);
  };
  window.addEventListener("themechange", handler);
  return () => window.removeEventListener("themechange", handler);
}
