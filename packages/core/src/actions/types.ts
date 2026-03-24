/**
 * AI Action Types
 * 
 * Defines all action types that AI can execute to interact with the page.
 * Supports both in-page actions (no refresh) and cross-page navigation.
 */

/**
 * All action type identifiers
 */
export type ActionType =
  | 'scroll-to-section'
  | 'highlight-text'
  | 'toggle-theme'
  | 'toggle-reading-mode'
  | 'set-preference'
  | 'navigate';

/**
 * Base action interface
 */
interface BaseAction {
  type: ActionType;
  payload: Record<string, unknown>;
  /** Whether user confirmation is required */
  confirm?: boolean;
  /** Confirmation prompt text */
  confirmText?: string;
  /** Action description for logging/debugging */
  description?: string;
}

/**
 * Scroll to a specific section
 */
export interface ScrollAction extends BaseAction {
  type: 'scroll-to-section';
  payload: {
    /** Section ID (slug) */
    sectionId: string;
    /** Scroll behavior */
    behavior?: 'smooth' | 'instant';
    /** Top offset in pixels */
    offset?: number;
    /** Whether to highlight the target */
    highlight?: boolean;
    /** Highlight duration in ms */
    highlightDuration?: number;
  };
}

/**
 * Highlight text elements
 */
export interface HighlightAction extends BaseAction {
  type: 'highlight-text';
  payload: {
    /** CSS selector */
    selector?: string;
    /** Text content to match */
    text?: string;
    /** Highlight style */
    style?: 'accent' | 'warning' | 'info' | 'success';
    /** Duration in ms, 0 for permanent */
    duration?: number;
    /** Whether to scroll into view */
    scrollIntoView?: boolean;
  };
}

/**
 * Toggle theme
 */
export interface ThemeAction extends BaseAction {
  type: 'toggle-theme';
  payload: {
    /** Target theme */
    theme: 'light' | 'dark' | 'system';
    /** Whether to use animation */
    animate?: boolean;
  };
}

/**
 * Toggle reading mode
 */
export interface ReadingModeAction extends BaseAction {
  type: 'toggle-reading-mode';
  payload: {
    enabled?: boolean;
    /** Reading mode settings */
    settings?: {
      fontSize?: 'sm' | 'md' | 'lg' | 'xl';
      theme?: 'light' | 'dark' | 'warm' | 'sepia';
      fontFamily?: string;
    };
  };
}

/**
 * Set a preference value
 */
export interface PreferenceAction extends BaseAction {
  type: 'set-preference';
  payload: {
    /** Preference path, e.g. 'reading.fontSize' */
    key: string;
    /** Preference value */
    value: unknown;
  };
}

/**
 * Navigate to another page
 */
export interface NavigateAction extends BaseAction {
  type: 'navigate';
  payload: {
    /** Target article slug */
    slug: string;
    /** Language */
    lang?: string;
    /** Actions to execute after navigation */
    then?: Action[];
  };
}

/**
 * Union type of all actions
 */
export type Action =
  | ScrollAction
  | HighlightAction
  | ThemeAction
  | ReadingModeAction
  | PreferenceAction
  | NavigateAction;

/**
 * Queued action item stored in sessionStorage
 */
export interface QueuedActionItem {
  /** Unique identifier */
  id: string;
  /** Action list */
  actions: Action[];
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
}

/**
 * Action execution result
 */
export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Global action executor interface
 */
export interface ActionExecutorInterface {
  execute(action: Action): Promise<ActionResult>;
  executeAll(actions: Action[]): Promise<{ success: boolean; results: ActionResult[] }>;
}