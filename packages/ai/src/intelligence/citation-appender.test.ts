import { describe, it, expect } from "vitest";
import {
  selectCitations,
  formatCitationBlock,
  shouldAppendCitations,
} from "./citation-appender.js";
import type { ArticleContext, ProjectContext } from "../search/types.js";

// ── Helpers ────────────────────────────────────────────────────

function makeArticle(
  overrides: Partial<ArticleContext> & { title: string; url: string }
): ArticleContext {
  return {
    keyPoints: [],
    categories: [],
    dateTime: 0,
    ...overrides,
  };
}

function makeProject(
  overrides: Partial<ProjectContext> & { name: string; url: string }
): ProjectContext {
  return {
    description: "",
    ...overrides,
  };
}

// ── selectCitations ────────────────────────────────────────────

describe("selectCitations", () => {
  it("should select articles above minScore", () => {
    const articles = [
      makeArticle({ title: "A", url: "/a/", score: 10 }),
      makeArticle({ title: "B", url: "/b/", score: 3 }),
    ];
    const result = selectCitations(articles, [], 5, 5);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("A");
  });

  it("should include projects above minScore", () => {
    const projects = [
      makeProject({ name: "P1", url: "/p1/", score: 8 }),
    ];
    const result = selectCitations([], projects, 5, 5);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("P1");
  });

  it("should sort by score descending", () => {
    const articles = [
      makeArticle({ title: "Low", url: "/low/", score: 6 }),
      makeArticle({ title: "High", url: "/high/", score: 15 }),
      makeArticle({ title: "Mid", url: "/mid/", score: 10 }),
    ];
    const result = selectCitations(articles, [], 10, 5);
    expect(result[0].title).toBe("High");
    expect(result[1].title).toBe("Mid");
    expect(result[2].title).toBe("Low");
  });

  it("should respect maxCitations limit", () => {
    const articles = Array.from({ length: 10 }, (_, i) =>
      makeArticle({ title: `A${i}`, url: `/a${i}/`, score: 10 - i })
    );
    const result = selectCitations(articles, [], 3, 0);
    expect(result).toHaveLength(3);
  });

  it("should return empty when nothing meets minScore", () => {
    const articles = [
      makeArticle({ title: "A", url: "/a/", score: 1 }),
    ];
    const result = selectCitations(articles, [], 5, 5);
    expect(result).toHaveLength(0);
  });

  it("should handle empty inputs", () => {
    const result = selectCitations([], [], 5, 0);
    expect(result).toHaveLength(0);
  });

  it("should mix articles and projects", () => {
    const articles = [
      makeArticle({ title: "Article", url: "/art/", score: 10 }),
    ];
    const projects = [
      makeProject({ name: "Project", url: "/proj/", score: 12 }),
    ];
    const result = selectCitations(articles, projects, 5, 0);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Project"); // Higher score first
  });
});

// ── formatCitationBlock ────────────────────────────────────────

describe("formatCitationBlock", () => {
  it("should return empty string for empty citations", () => {
    expect(formatCitationBlock([], "zh")).toBe("");
  });

  it("should format citations in Chinese", () => {
    const citations = [
      { title: "文章A", url: "/a/", score: 10 },
    ];
    const result = formatCitationBlock(citations, "zh");
    expect(result).toContain("延伸阅读");
    expect(result).toContain("[文章A](/a/)");
  });

  it("should format citations in English", () => {
    const citations = [
      { title: "Article A", url: "/a/", score: 10 },
    ];
    const result = formatCitationBlock(citations, "en");
    expect(result).toContain("Further Reading");
    expect(result).toContain("[Article A](/a/)");
  });

  it("should format multiple citations as list", () => {
    const citations = [
      { title: "A", url: "/a/", score: 10 },
      { title: "B", url: "/b/", score: 8 },
    ];
    const result = formatCitationBlock(citations, "zh");
    expect(result).toContain("- [A](/a/)");
    expect(result).toContain("- [B](/b/)");
  });
});

// ── shouldAppendCitations ──────────────────────────────────────

describe("shouldAppendCitations", () => {
  it("should return true when response has no citations and articles have high scores", () => {
    const articles = [
      makeArticle({ title: "A", url: "/a/", score: 10 }),
    ];
    expect(shouldAppendCitations("Some response text", articles, [])).toBe(true);
  });

  it("should return false when response already has citations", () => {
    const articles = [
      makeArticle({ title: "A", url: "/a/", score: 10 }),
    ];
    const response = "Check out [A](/a/) for more.";
    expect(shouldAppendCitations(response, articles, [])).toBe(false);
  });

  it("should return false when no articles meet score threshold", () => {
    const articles = [
      makeArticle({ title: "A", url: "/a/", score: 2 }),
    ];
    expect(shouldAppendCitations("Some text", articles, [])).toBe(false);
  });

  it("should return false for empty articles and projects", () => {
    expect(shouldAppendCitations("Some text", [], [])).toBe(false);
  });

  it("should include projects in score check", () => {
    const projects = [
      makeProject({ name: "P", url: "/p/", score: 10 }),
    ];
    expect(shouldAppendCitations("Some text", [], projects)).toBe(true);
  });
});
