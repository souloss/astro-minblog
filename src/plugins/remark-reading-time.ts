import { getReadingTime } from "../utils/getReadingTime";

/**
 * Remark plugin that calculates reading time and word count,
 * injecting them into `data.astro.frontmatter`.
 */
export function remarkReadingTime() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_tree: any, file: any) {
    const content = file.value as string;
    const { minutes, words } = getReadingTime(content);
    const data = file.data as { astro?: { frontmatter?: Record<string, unknown> } };
    if (data.astro?.frontmatter) {
      data.astro.frontmatter.minutesRead = `${minutes} min`;
      data.astro.frontmatter.words = words;
    }
  };
}
