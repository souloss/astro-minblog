import { getReadingTime } from "../utils/getReadingTime";

type RemarkFileLike = {
  value?: unknown;
  data?: {
    astro?: {
      frontmatter?: Record<string, unknown>;
    };
  };
};

/**
 * Remark plugin that calculates reading time and word count,
 * injecting them into `data.astro.frontmatter`.
 */
export function remarkReadingTime() {
  return function (_tree: unknown, file: RemarkFileLike) {
    const content = typeof file.value === "string" ? file.value : "";
    const { minutes, words } = getReadingTime(content);
    const data = file.data;
    const frontmatter = data?.astro?.frontmatter;
    if (frontmatter) {
      frontmatter.minutesRead = `${minutes} min`;
      frontmatter.words = words;
    }
  };
}
