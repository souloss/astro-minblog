import type { Action, ActionType, ActionResult } from "./types";

const VALID_TYPES: Set<string> = new Set([
  "scroll-to-section",
  "highlight-text",
  "toggle-theme",
  "toggle-reading-mode",
  "set-preference",
  "navigate",
]);

function isValidType(type: unknown): type is ActionType {
  return typeof type === "string" && VALID_TYPES.has(type);
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function validateScrollToSection(
  payload: unknown
): { valid: true } | { valid: false; error: string } {
  if (!isObject(payload)) {
    return { valid: false, error: "payload must be an object" };
  }

  if (
    typeof payload.sectionId !== "string" ||
    payload.sectionId.trim() === ""
  ) {
    return {
      valid: false,
      error: "sectionId is required and must be a non-empty string",
    };
  }

  if (
    payload.behavior !== undefined &&
    !["smooth", "instant"].includes(payload.behavior as string)
  ) {
    return { valid: false, error: 'behavior must be "smooth" or "instant"' };
  }

  if (payload.offset !== undefined && typeof payload.offset !== "number") {
    return { valid: false, error: "offset must be a number" };
  }

  if (
    payload.highlight !== undefined &&
    typeof payload.highlight !== "boolean"
  ) {
    return { valid: false, error: "highlight must be a boolean" };
  }

  if (
    payload.highlightDuration !== undefined &&
    typeof payload.highlightDuration !== "number"
  ) {
    return { valid: false, error: "highlightDuration must be a number" };
  }

  return { valid: true };
}

function validateHighlightText(
  payload: unknown
): { valid: true } | { valid: false; error: string } {
  if (!isObject(payload)) {
    return { valid: false, error: "payload must be an object" };
  }

  if (!payload.selector && !payload.text) {
    return { valid: false, error: "either selector or text is required" };
  }

  if (payload.selector !== undefined && typeof payload.selector !== "string") {
    return { valid: false, error: "selector must be a string" };
  }

  if (payload.text !== undefined && typeof payload.text !== "string") {
    return { valid: false, error: "text must be a string" };
  }

  if (
    payload.style !== undefined &&
    !["accent", "warning", "info", "success"].includes(payload.style as string)
  ) {
    return {
      valid: false,
      error: 'style must be "accent", "warning", "info", or "success"',
    };
  }

  if (payload.duration !== undefined && typeof payload.duration !== "number") {
    return { valid: false, error: "duration must be a number" };
  }

  if (
    payload.scrollIntoView !== undefined &&
    typeof payload.scrollIntoView !== "boolean"
  ) {
    return { valid: false, error: "scrollIntoView must be a boolean" };
  }

  return { valid: true };
}

function validateToggleTheme(
  payload: unknown
): { valid: true } | { valid: false; error: string } {
  if (!isObject(payload)) {
    return { valid: false, error: "payload must be an object" };
  }

  if (!["light", "dark", "system"].includes(payload.theme as string)) {
    return {
      valid: false,
      error: 'theme must be "light", "dark", or "system"',
    };
  }

  if (payload.animate !== undefined && typeof payload.animate !== "boolean") {
    return { valid: false, error: "animate must be a boolean" };
  }

  return { valid: true };
}

function validateToggleReadingMode(
  payload: unknown
): { valid: true } | { valid: false; error: string } {
  if (!isObject(payload)) {
    return { valid: false, error: "payload must be an object" };
  }

  if (payload.enabled !== undefined && typeof payload.enabled !== "boolean") {
    return { valid: false, error: "enabled must be a boolean" };
  }

  if (payload.settings !== undefined && !isObject(payload.settings)) {
    return { valid: false, error: "settings must be an object" };
  }

  return { valid: true };
}

function validateSetPreference(
  payload: unknown
): { valid: true } | { valid: false; error: string } {
  if (!isObject(payload)) {
    return { valid: false, error: "payload must be an object" };
  }

  if (typeof payload.key !== "string" || payload.key.trim() === "") {
    return {
      valid: false,
      error: "key is required and must be a non-empty string",
    };
  }

  if (payload.value === undefined) {
    return { valid: false, error: "value is required" };
  }

  return { valid: true };
}

function validateNavigate(
  payload: unknown
): { valid: true } | { valid: false; error: string } {
  if (!isObject(payload)) {
    return { valid: false, error: "payload must be an object" };
  }

  if (typeof payload.slug !== "string" || payload.slug.trim() === "") {
    return {
      valid: false,
      error: "slug is required and must be a non-empty string",
    };
  }

  if (payload.lang !== undefined && typeof payload.lang !== "string") {
    return { valid: false, error: "lang must be a string" };
  }

  if (payload.then !== undefined) {
    if (!Array.isArray(payload.then)) {
      return { valid: false, error: "then must be an array of actions" };
    }
    for (let i = 0; i < payload.then.length; i++) {
      const subResult = validateAction(payload.then[i]);
      if (!subResult.valid) {
        return { valid: false, error: `then[${i}]: ${subResult.error}` };
      }
    }
  }

  return { valid: true };
}

const VALIDATORS: Record<
  ActionType,
  (payload: unknown) => { valid: true } | { valid: false; error: string }
> = {
  "scroll-to-section": validateScrollToSection,
  "highlight-text": validateHighlightText,
  "toggle-theme": validateToggleTheme,
  "toggle-reading-mode": validateToggleReadingMode,
  "set-preference": validateSetPreference,
  navigate: validateNavigate,
};

export function validateAction(
  raw: unknown
): { valid: true; action: Action } | { valid: false; error: string } {
  if (!isObject(raw)) {
    return { valid: false, error: "action must be an object" };
  }

  const { type, payload } = raw;

  if (!isValidType(type)) {
    return {
      valid: false,
      error: `invalid type: ${JSON.stringify(type)}. Valid types: ${[...VALID_TYPES].join(", ")}`,
    };
  }

  const validator = VALIDATORS[type];
  const result = validator(payload);

  if (!result.valid) {
    return {
      valid: false,
      error: `payload validation failed: ${result.error}`,
    };
  }

  return { valid: true, action: { type, payload } as Action };
}

export function validateAndExecute(action: unknown): Promise<ActionResult> {
  const validated = validateAction(action);

  if (!validated.valid) {
    return Promise.resolve({ success: false, error: validated.error });
  }

  const executor = window.__actionExecutor;

  if (!executor) {
    return Promise.resolve({
      success: false,
      error: "ActionExecutor not initialized",
    });
  }

  return executor.execute(validated.action);
}
