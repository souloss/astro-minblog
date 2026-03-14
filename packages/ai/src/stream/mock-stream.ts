import { getMockResponse } from '../providers/mock.js';

export interface MockStreamOptions {
  question: string;
  lang?: string;
  /** Delay range per character chunk in ms [min, max] */
  delayRange?: [number, number];
}

/**
 * Streams a mock response character-by-character as a ReadableStream<string>.
 * Simulates natural typing speed with variable delays.
 */
export function streamMockResponse(options: MockStreamOptions): ReadableStream<string> {
  const { question, lang = 'zh', delayRange = [12, 35] } = options;
  const text = getMockResponse(question, lang);
  const [minDelay, maxDelay] = delayRange;

  let index = 0;

  return new ReadableStream<string>({
    async pull(controller) {
      if (index >= text.length) {
        controller.close();
        return;
      }
      const chunkSize = Math.random() < 0.25 ? 2 : 1;
      const chunk = text.slice(index, index + chunkSize);
      index += chunkSize;
      controller.enqueue(chunk);
      await sleep(minDelay + Math.random() * (maxDelay - minDelay));
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
