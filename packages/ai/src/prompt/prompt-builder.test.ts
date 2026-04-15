import { describe, it, expect, vi } from "vitest";

// Mock the layer builders
vi.mock("./static-layer.js", () => ({
  buildStaticLayer: vi.fn(() => "STATIC_LAYER"),
}));

vi.mock("./semi-static-layer.js", () => ({
  buildSemiStaticLayer: vi.fn(() => "SEMI_STATIC_LAYER"),
}));

vi.mock("./dynamic-layer.js", () => ({
  buildDynamicLayer: vi.fn(() => "DYNAMIC_LAYER"),
}));

import { buildSystemPrompt } from "./prompt-builder.js";
import { buildStaticLayer } from "./static-layer.js";
import { buildSemiStaticLayer } from "./semi-static-layer.js";
import { buildDynamicLayer } from "./dynamic-layer.js";

describe("buildSystemPrompt", () => {
  it("joins all three layers with double newlines", () => {
    const result = buildSystemPrompt({
      static: { authorName: "Test", siteUrl: "https://test.com" },
      semiStatic: { authorContext: null },
      dynamic: { userQuery: "test", articles: [], projects: [] },
    });

    expect(result).toBe("STATIC_LAYER\n\nSEMI_STATIC_LAYER\n\nDYNAMIC_LAYER");
  });

  it("filters out empty layers", () => {
    vi.mocked(buildSemiStaticLayer).mockReturnValue("");

    const result = buildSystemPrompt({
      static: { authorName: "Test", siteUrl: "https://test.com" },
      semiStatic: { authorContext: null },
      dynamic: { userQuery: "test", articles: [], projects: [] },
    });

    expect(result).toBe("STATIC_LAYER\n\nDYNAMIC_LAYER");
    vi.mocked(buildSemiStaticLayer).mockReturnValue("SEMI_STATIC_LAYER");
  });

  it("passes lang from static config to semi-static", () => {
    buildSystemPrompt({
      static: { authorName: "Test", siteUrl: "https://test.com", lang: "en" },
      semiStatic: { authorContext: null },
      dynamic: { userQuery: "test", articles: [], projects: [] },
    });

    expect(buildSemiStaticLayer).toHaveBeenCalledWith(
      expect.objectContaining({ lang: "en" })
    );
  });

  it("passes preferArticleLocal from dynamic config", () => {
    buildSystemPrompt({
      static: { authorName: "Test", siteUrl: "https://test.com" },
      semiStatic: { authorContext: null },
      dynamic: {
        userQuery: "test",
        articles: [],
        projects: [],
        preferInjectedChunks: true,
      },
    });

    expect(buildSemiStaticLayer).toHaveBeenCalledWith(
      expect.objectContaining({ preferArticleLocal: true })
    );
  });

  it("falls back to dynamic lang when static has no lang", () => {
    buildSystemPrompt({
      static: { authorName: "Test", siteUrl: "https://test.com" },
      semiStatic: { authorContext: null },
      dynamic: { userQuery: "test", articles: [], projects: [], lang: "zh" },
    });

    expect(buildSemiStaticLayer).toHaveBeenCalledWith(
      expect.objectContaining({ lang: "zh" })
    );
  });
});
