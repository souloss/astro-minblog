import { useState, useCallback } from 'preact/hooks';
import { ChatPanel } from './ChatPanel.js';
import type { AIChatConfig } from './ChatPanel.js';

interface Props {
  config: AIChatConfig;
}

/**
 * Container that manages the open/close state of the chat panel.
 * The FloatingActions FAB button communicates via a custom event.
 */
export default function AIChatContainer({ config }: Props) {
  const [open, setOpen] = useState(false);

  // Listen for FAB button click events (dispatched by FloatingActions.astro)
  // We attach the listener in an effect
  const handleToggle = useCallback(() => setOpen(prev => !prev), []);
  const handleClose = useCallback(() => setOpen(false), []);

  // Register global toggle function so vanilla JS in FloatingActions can call it
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__aiChatToggle = handleToggle;
  }

  return (
    <ChatPanel
      open={open}
      onClose={handleClose}
      config={config}
    />
  );
}
