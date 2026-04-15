import { describe, expect, it } from "vitest";
import { parseBlocks } from "./RichText.tsx";

describe("parseBlocks heading support", () => {
  it("parses h1 heading (# Heading 1)", () => {
    const blocks = parseBlocks("# Heading 1");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "heading",
      content: "Heading 1",
      level: 1,
    });
  });

  it("parses h3 heading (### Heading 3)", () => {
    const blocks = parseBlocks("### Heading 3");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "heading",
      content: "Heading 3",
      level: 3,
    });
  });

  it("parses h6 heading (###### Heading 6)", () => {
    const blocks = parseBlocks("###### Heading 6");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "heading",
      content: "Heading 6",
      level: 6,
    });
  });

  it("parses heading with inline markdown content", () => {
    const blocks = parseBlocks("### **Bold** and `code`");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "heading",
      content: "**Bold** and `code`",
      level: 3,
    });
  });

  it("parses heading followed by paragraph", () => {
    const blocks = parseBlocks("## Title\nSome text");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      type: "heading",
      content: "Title",
      level: 2,
    });
    expect(blocks[1]).toEqual({
      type: "paragraph",
      content: "Some text",
    });
  });

  it("does NOT parse #no-space as heading", () => {
    const blocks = parseBlocks("#no-space");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].content).toBe("#no-space");
  });

  it("parses empty heading (### ) as heading with empty content", () => {
    const blocks = parseBlocks("### ");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: "heading",
      content: "",
      level: 3,
    });
  });

  it("does NOT parse 7 hashes as heading (####### not a heading)", () => {
    const blocks = parseBlocks("####### not a heading");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[0].content).toBe("####### not a heading");
  });

  it("parses all heading levels correctly", () => {
    const input = [
      "# Level 1",
      "## Level 2",
      "### Level 3",
      "#### Level 4",
      "##### Level 5",
      "###### Level 6",
    ].join("\n");

    const blocks = parseBlocks(input);
    expect(blocks).toHaveLength(6);

    for (let level = 1; level <= 6; level++) {
      expect(blocks[level - 1]).toEqual({
        type: "heading",
        content: `Level ${level}`,
        level,
      });
    }
  });

  it("handles heading between other block types", () => {
    const input = "Some intro\n### Section\n- item 1\n- item 2";
    const blocks = parseBlocks(input);

    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: "paragraph", content: "Some intro" });
    expect(blocks[1]).toEqual({
      type: "heading",
      content: "Section",
      level: 3,
    });
    expect(blocks[2]).toEqual({
      type: "list",
      content: "",
      ordered: false,
      items: ["item 1", "item 2"],
    });
  });
});
