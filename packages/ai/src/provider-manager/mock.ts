import type { StreamTextOptions, StreamTextResult } from "./types.js";
import { BaseProviderAdapter } from "./base.js";
import { getMockResponse } from "../providers/mock.js";

const MOCK_WEIGHT = 0;
const CHAR_DELAY_MS = 15;

export class MockAdapter extends BaseProviderAdapter {
  readonly id = "mock" as const;
  readonly type = "mock" as const;
  readonly weight = MOCK_WEIGHT;
  readonly model = "mock";
  readonly keywordModel = "mock";
  readonly evidenceModel = "mock";
  readonly timeout = 0;

  constructor() {
    super({ unhealthyThreshold: 999 });
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async streamText(options: StreamTextOptions): Promise<StreamTextResult> {
    const { userQuestion = "", lang = "zh" } = options;
    const text = getMockResponse(userQuestion, lang);
    const partId = `mock-${Date.now()}`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const write = (event: object) =>
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );

        write({ type: "text-start", id: partId });

        for (let i = 0; i < text.length; ) {
          const chunkSize =
            Math.random() < 0.3 ? 3 : Math.random() < 0.5 ? 2 : 1;
          const chunk = text.slice(i, i + chunkSize);
          i += chunkSize;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text-delta", id: partId, delta: chunk })}\n\n`
            )
          );
          await new Promise(r =>
            setTimeout(r, CHAR_DELAY_MS + Math.random() * 20)
          );
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text-end", id: partId })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "finish", finishReason: "stop" })}\n\n`
          )
        );
        controller.close();
      },
    });

    const response = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });

    return {
      toUIMessageStreamResponse: () => response,
      providerId: this.id,
      isMock: true,
    };
  }

  getProvider(): { chatModel: (model: string) => unknown } {
    throw new Error("Mock provider does not support chatModel interface");
  }
}
