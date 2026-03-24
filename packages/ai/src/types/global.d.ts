/**
 * Augmented Window interface for AI module globals.
 * Eliminates `as unknown as` casts when accessing these properties.
 */

interface ActionExecutorInterface {
  execute(action: { type: string; payload: Record<string, unknown> }): Promise<{ success: boolean; error?: string }>;
  executeAll(actions: { type: string; payload: Record<string, unknown> }[]): Promise<{ success: boolean; results: { success: boolean; error?: string }[] }>;
}

interface Window {
  __actionExecutor?: ActionExecutorInterface;
  __aiChatToggle?: () => void;
  __articleContext?: { slug: string; lang?: string };
  theme?: {
    themeValue?: string;
    setTheme?: (val: string) => void;
    reflectPreference?: () => void;
  };
}
