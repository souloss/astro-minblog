function getReadingTime(content) {
  const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
  const wordRegex = /\b[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*\b/g;
  const cjkWpm = 350;
  const enWpm = 230;

  const text = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/^---[\s\S]*?---/m, "")
    .replace(/#+\s/g, "")
    .replace(/[*_~]/g, "");

  const cjkChars = text.match(cjkRegex) || [];
  const enWords = text.match(wordRegex) || [];
  const cjkCount = cjkChars.length;
  const enCount = enWords.filter(w => !cjkRegex.test(w) && w.length > 0).length;
  const totalWords = cjkCount + enCount;
  const minutes = Math.max(1, Math.ceil(cjkCount / cjkWpm + enCount / enWpm));

  return { minutes, words: totalWords };
}

export function remarkReadingTime() {
  return function (_tree, file) {
    const content = typeof file?.value === "string" ? file.value : "";
    const { minutes, words } = getReadingTime(content);
    const frontmatter = file?.data?.astro?.frontmatter;
    if (frontmatter) {
      frontmatter.minutesRead = `${minutes} min`;
      frontmatter.words = words;
    }
  };
}
