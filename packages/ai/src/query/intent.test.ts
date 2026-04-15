import { describe, it, expect } from "vitest";
import { classifyIntent, rankArticlesByCategory, rankArticlesByIntent } from "./intent.js";
import type { ArticleContext } from "../search/types.js";

describe("classifyIntent", () => {
  it("should classify setup queries", () => {
    expect(classifyIntent("怎么搭建博客")).toBe("setup");
    expect(classifyIntent("how to install")).toBe("setup");
  });

  it("should classify config queries", () => {
    expect(classifyIntent("如何配置主题")).toBe("config");
    expect(classifyIntent("settings for AI")).toBe("config");
  });

  it("should classify content queries", () => {
    expect(classifyIntent("写文章")).toBe("content");
    expect(classifyIntent("markdown syntax")).toBe("content");
  });

  it("should classify feature queries", () => {
    expect(classifyIntent("AI 功能")).toBe("feature");
    expect(classifyIntent("dark mode feature")).toBe("feature");
  });

  it("should classify deployment queries", () => {
    expect(classifyIntent("部署到 cloudflare")).toBe("deployment");
    expect(classifyIntent("how to deploy")).toBe("deployment");
  });

  it("should classify troubleshooting queries", () => {
    expect(classifyIntent("报错 error")).toBe("troubleshooting");
    expect(classifyIntent("error bug fix")).toBe("troubleshooting");
  });

  it("should return 'general' for ambiguous queries", () => {
    expect(classifyIntent("hello")).toBe("general");
    expect(classifyIntent("天气怎么样")).toBe("general");
  });

  it("should be case insensitive", () => {
    expect(classifyIntent("DEPLOY")).toBe("deployment");
    expect(classifyIntent("Setup")).toBe("setup");
  });
});

describe("rankArticlesByCategory", () => {
  const articles: ArticleContext[] = [
    {
      id: "deploy-guide",
      url: "/posts/deploy-guide/",
      title: "部署指南",
      summary: "如何部署到 Cloudflare",
      categories: ["deployment"],
      keyPoints: ["步骤1", "步骤2"],
      dateTime: Date.now(),
    },
    {
      id: "setup-guide",
      url: "/posts/setup-guide/",
      title: "入门教程",
      summary: "如何开始搭建",
      categories: ["tutorial"],
      keyPoints: ["安装", "配置"],
      dateTime: Date.now(),
    },
  ];

  it("should return same array for general intent", () => {
    const result = rankArticlesByCategory("general", articles);
    expect(result).toEqual(articles);
  });

  it("should return same array for single article", () => {
    const result = rankArticlesByCategory("deployment", [articles[0]]);
    expect(result).toHaveLength(1);
  });

  it("should rank articles by intent match", () => {
    const result = rankArticlesByCategory("deployment", articles);
    // Deploy guide should rank higher for deployment intent
    expect(result[0].id).toBe("deploy-guide");
  });
});

describe("rankArticlesByIntent", () => {
  it("should classify and rank in one call", () => {
    const articles: ArticleContext[] = [
      {
        id: "config-guide",
        url: "/posts/config-guide/",
        title: "配置指南",
        summary: "环境变量配置",
        categories: ["config"],
        keyPoints: ["env"],
        dateTime: Date.now(),
      },
    ];
    const result = rankArticlesByIntent("如何配置", articles);
    expect(result).toHaveLength(1);
  });
});
