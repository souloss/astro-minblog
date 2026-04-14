import { useEffect, useMemo, useRef } from "preact/hooks";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";

import type { ArticleChatContext } from "../../server/types.js";
import { shouldAutoContinueAfterToolCalls } from "../tool-auto-continue.js";
import { TOOL_ACTION_MAP } from "./tool-actions.js";
import { createLogger } from "../../utils/logger.js";

const log = createLogger("useLiveChat");

export interface UseLiveChatOptions {
  config: {
    apiEndpoint?: string;
    showSourceSnippets?: boolean;
  };
  articleContext?: ArticleChatContext;
  lang: string;
  welcomeMessage: UIMessage;
}

export function useLiveChat({
  config,
  articleContext,
  lang,
  welcomeMessage,
}: UseLiveChatOptions) {
  const sessionId = useMemo(() => {
    if (articleContext?.slug) return `article:${articleContext.slug}`;
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }, [articleContext]);

  // Fix transport stability: use JSON.stringify as memo key for articleContext
  const articleContextKey = useMemo(
    () => JSON.stringify(articleContext),
    [articleContext]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: config.apiEndpoint ?? "/api/chat",
        prepareSendMessagesRequest: ({ id, messages: msgs }) => ({
          headers: { "x-session-id": sessionId },
          body: {
            id,
            messages: msgs,
            lang,
            context: articleContext
              ? { scope: "article" as const, article: articleContext }
              : { scope: "global" as const },
          },
        }),
      }),
    [config.apiEndpoint, sessionId, articleContextKey, lang]
  );

  const {
    messages: liveMessages,
    sendMessage: liveSendMessage,
    setMessages: liveSetMessages,
    regenerate,
    status: liveStatus,
    error: liveError,
    addToolOutput,
  } = useChat({
    transport,
    sendAutomaticallyWhen: shouldAutoContinueAfterToolCalls,
    async onToolCall({ toolCall }) {
      const executor = window.__actionExecutor;

      if (!executor) {
        log.warn("ActionExecutor not initialized");
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: false,
            tool: toolCall.toolName,
            error: "ActionExecutor not initialized",
          },
        });
        return;
      }

      const mapper = TOOL_ACTION_MAP[toolCall.toolName];
      if (!mapper) {
        log.warn("Unknown tool:", toolCall.toolName);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: false,
            tool: toolCall.toolName,
            error: `Unknown tool: ${toolCall.toolName}`,
          },
        });
        return;
      }

      try {
        const toolInput = (toolCall.input ?? {}) as Record<string, unknown>;
        const action = mapper(toolInput);
        const result = await executor.execute(action);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: result.success,
            tool: toolCall.toolName,
            action: action.type,
            input: toolInput,
            result,
            confirmation: result.success
              ? `Tool ${toolCall.toolName} executed successfully.`
              : `Tool ${toolCall.toolName} failed: ${result.error ?? "unknown error"}`,
          },
        });
      } catch (error) {
        log.error("Tool execution error:", error);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: {
            success: false,
            tool: toolCall.toolName,
            error: String(error),
          },
        });
      }
    },
  });

  // Initialize welcome message on mount only.
  // Empty deps is intentional: we only set the welcome message once,
  // not re-set it every time liveMessages/welcomeMessage changes.
  useEffect(() => {
    if (liveMessages.length === 0) {
      liveSetMessages([welcomeMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    liveMessages,
    liveSendMessage,
    liveSetMessages,
    regenerate,
    liveStatus,
    liveError,
  };
}
