import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { getMockResponse, createMockStream } from "../../providers/mock.ts";

export interface MockMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

export function useMockChat(lang: string) {
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: MockMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text,
      };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: MockMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        streaming: true,
      };
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const stream = createMockStream(getMockResponse(text, lang));
      const reader = stream.getReader();
      let accumulated = "";
      try {
        while (true) {
          if (!mountedRef.current) break;
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += value;
          if (!mountedRef.current) break;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, text: accumulated } : m
            )
          );
        }
      } finally {
        if (mountedRef.current) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, streaming: false } : m
            )
          );
          setIsStreaming(false);
        }
      }
    },
    [lang]
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, isStreaming, sendMessage, clear };
}
