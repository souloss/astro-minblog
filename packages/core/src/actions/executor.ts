import type { Action, ActionResult, NavigateAction } from "./types";
import { updatePreferences, type Preferences } from "../preferences";
import { ActionQueue } from "./queue";

type ActionReadingTheme = Preferences["reading"]["theme"];

export const ActionExecutor = {
  async execute(action: Action): Promise<ActionResult> {
    try {
      switch (action.type) {
        case "scroll-to-section":
          return this.scrollToSection(action.payload);

        case "highlight-text":
          return this.highlightText(action.payload);

        case "toggle-theme":
          return this.toggleTheme(action.payload);

        case "toggle-reading-mode":
          return this.toggleReadingMode(action.payload);

        case "set-preference":
          return this.setPreference(action.payload);

        case "navigate":
          return this.navigate(action.payload as NavigateAction["payload"]);

        default:
          return {
            success: false,
            error: `Unknown action type: ${(action as Action).type}`,
          };
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      return { success: false, error };
    }
  },

  async executeAll(
    actions: Action[]
  ): Promise<{ success: boolean; results: ActionResult[] }> {
    const results = await Promise.all(actions.map(a => this.execute(a)));
    return {
      success: results.every(r => r.success),
      results,
    };
  },

  scrollToSection(payload: Record<string, unknown>): ActionResult {
    const sectionId = payload.sectionId as string;
    const behavior = (payload.behavior as "smooth" | "instant") || "smooth";
    const offset = (payload.offset as number) ?? 100;
    const highlight = payload.highlight !== false;
    const highlightDuration = (payload.highlightDuration as number) ?? 3000;

    if (!sectionId) {
      return { success: false, error: "sectionId is required" };
    }

    const sanitizedId = CSS.escape
      ? CSS.escape(sectionId)
      : sectionId.replace(/[^\w\u4e00-\u9fff-]/g, "");

    const element: HTMLElement | null =
      document.getElementById(sectionId) ||
      document.querySelector(`[data-section-id="${sanitizedId}"]`) ||
      document.querySelector(
        `h2[id*="${sanitizedId}"], h3[id*="${sanitizedId}"]`
      );

    if (!element) {
      return { success: false, error: `Section not found: ${sectionId}` };
    }

    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior });

    if (highlight) {
      element.classList.add("ai-section-highlight");
      setTimeout(
        () => element.classList.remove("ai-section-highlight"),
        highlightDuration
      );
    }

    return { success: true };
  },

  highlightText(payload: Record<string, unknown>): ActionResult {
    const selector = payload.selector as string | undefined;
    const text = payload.text as string | undefined;
    const style =
      (payload.style as "accent" | "warning" | "info" | "success") || "accent";
    const duration = (payload.duration as number) ?? 3000;
    const scrollIntoView = payload.scrollIntoView === true;

    let elements: Element[] = selector
      ? Array.from(document.querySelectorAll(selector))
      : [];

    if (elements.length === 0 && text) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      const matches: Element[] = [];
      let node: Text | null;

      while ((node = walker.nextNode() as Text | null)) {
        if (node.textContent?.includes(text)) {
          const span = document.createElement("span");
          span.className = `ai-highlight ai-highlight-${style}`;
          node.parentNode?.replaceChild(span, node);
          span.appendChild(node);
          matches.push(span);
        }
      }
      elements = matches;
    }

    if (elements.length === 0) {
      return { success: false, error: "No elements found to highlight" };
    }

    elements.forEach(el => {
      el.classList.add(`ai-highlight-${style}`);

      if (scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (duration > 0) {
        setTimeout(
          () => el.classList.remove(`ai-highlight-${style}`),
          duration
        );
      }
    });

    return { success: true };
  },

  toggleTheme(payload: Record<string, unknown>): ActionResult {
    const theme = payload.theme as "light" | "dark" | "system";
    const animate = payload.animate !== false;

    const html = document.documentElement;
    const resolvedTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    updatePreferences({
      theme: {
        mode: theme,
      },
    });

    const win = window;

    if (win.theme) {
      if (typeof win.theme.setTheme === "function") {
        try {
          win.theme.setTheme(theme);
        } catch {
          /* ignore */
        }
      }
      if (typeof win.theme.reflectPreference === "function") {
        try {
          win.theme.reflectPreference();
        } catch {
          /* ignore */
        }
      }
    }

    if (animate) {
      html.classList.add("theme-transition");
      setTimeout(() => {
        html.classList.remove("theme-transition");
      }, 400);
    }

    return { success: true };
  },

  toggleReadingMode(payload: Record<string, unknown>): ActionResult {
    const enabled = payload.enabled as boolean | undefined;
    const settings = payload.settings as
        | {
          fontSize?: "sm" | "md" | "lg" | "xl";
          theme?: ActionReadingTheme;
          fontFamily?: string;
        }
      | undefined;

    const html = document.documentElement;

    if (enabled !== undefined) {
      html.classList.toggle("reading-mode", enabled);
    } else {
      html.classList.toggle("reading-mode");
    }

    if (settings) {
      const updates: Partial<Preferences> = {};

      if (settings.fontSize || settings.theme) {
        updates.reading = {
          ...(settings.fontSize ? { fontSize: settings.fontSize } : {}),
          ...(settings.theme ? { theme: settings.theme } : {}),
        } as Preferences["reading"];
      }

      if (Object.keys(updates).length > 0) {
        updatePreferences(updates);
      }
    }

    return { success: true };
  },

  setPreference(payload: Record<string, unknown>): ActionResult {
    const key = payload.key as string;
    const value = payload.value;

    if (!key) {
      return { success: false, error: "key is required" };
    }

    const keys = key.split(".");

    if (keys.length === 1) {
      updatePreferences({ [key]: value } as Partial<Preferences>);
    } else {
      const [category, subKey] = keys;
      updatePreferences({
        [category]: { [subKey]: value },
      } as Partial<Preferences>);
    }

    return { success: true };
  },

  async navigate(payload: NavigateAction["payload"]): Promise<ActionResult> {
    const slug = payload.slug;
    const lang = payload.lang || "zh";
    const then = payload.then;

    if (!slug) {
      return { success: false, error: "slug is required" };
    }

    const currentSlug = window.__articleContext?.slug;
    const isSameArticle = currentSlug === slug;

    if (isSameArticle) {
      if (then && then.length > 0) {
        await this.executeAll(then);
      }
      return { success: true };
    }

    const url = new URL(window.location.origin);
    url.pathname = `/${lang}/posts/${slug}`;

    if (then && then.length > 0) {
      const token = ActionQueue.enqueue(then);
      url.searchParams.set("ai_actions", token);
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        window.location.href = url.toString();
      });
    } else {
      window.location.href = url.toString();
    }

    return { success: true };
  },
};

if (typeof window !== "undefined") {
  window.__actionExecutor = ActionExecutor;
}
