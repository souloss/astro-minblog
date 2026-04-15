import { describe, it, expect, beforeEach } from "vitest";
import { getExtensionRegistry, resetExtensionRegistry } from "./registry.js";
import type { Extension, SearchableData, FactsData } from "./types.js";

const searchExt: Extension<SearchableData> = {
  id: "test-search",
  type: "searchable",
  name: "Test Search",
  priority: 10,
  data: {
    documents: [{
      id: "ext-doc-1",
      title: "Extension Document",
      url: "/ext-doc",
      excerpt: "Test excerpt",
      content: "Test content",
      categories: ["test"],
      dateTime: 0,
    }],
  },
};

const factsExt: Extension<FactsData> = {
  id: "test-facts",
  type: "facts",
  name: "Test Facts",
  priority: 20,
  data: {
    facts: [{
      id: "fact-1",
      category: "tech",
      statement: "Uses React",
      confidence: 0.9,
      tags: ["react"],
      lang: "en",
    }],
  },
};

beforeEach(() => {
  resetExtensionRegistry();
});

describe("ExtensionRegistry", () => {
  it("should register and retrieve an extension", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    const retrieved = registry.get<SearchableData>("test-search");
    expect(retrieved).toBeDefined();
    expect(retrieved!.data.documents).toHaveLength(1);
  });

  it("should return all extensions sorted by priority", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt); // priority 10
    registry.register(factsExt); // priority 20
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all[0]!.id).toBe("test-facts"); // higher priority first
  });

  it("should filter extensions by type", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    registry.register(factsExt);
    const searchable = registry.getByType("searchable");
    expect(searchable).toHaveLength(1);
    expect(searchable[0]!.id).toBe("test-search");
  });

  it("should exclude disabled extensions", () => {
    const registry = getExtensionRegistry();
    registry.register({ ...searchExt, enabled: false });
    expect(registry.getAll()).toHaveLength(0);
  });

  it("should unregister an extension", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    expect(registry.getAll()).toHaveLength(1);
    registry.unregister("test-search");
    expect(registry.getAll()).toHaveLength(0);
  });

  it("should clear all extensions", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    registry.register(factsExt);
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });

  it("should cache loaded extensions", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    const loaded1 = registry.getLoadedExtensions();
    const loaded2 = registry.getLoadedExtensions();
    expect(loaded1).toBe(loaded2); // Same reference (cached)
  });

  it("should invalidate cache on register", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    const loaded1 = registry.getLoadedExtensions();
    registry.register(factsExt);
    const loaded2 = registry.getLoadedExtensions();
    expect(loaded1).not.toBe(loaded2); // Different reference (cache invalidated)
  });

  it("should build loaded extensions with searchable data", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    const loaded = registry.getLoadedExtensions();
    expect(loaded.searchable.has("test-search")).toBe(true);
  });

  it("should build loaded extensions with facts data", () => {
    const registry = getExtensionRegistry();
    registry.register(factsExt);
    const loaded = registry.getLoadedExtensions();
    expect(loaded.facts.has("test-facts")).toBe(true);
  });

  it("should overwrite duplicate extension with warning", () => {
    const registry = getExtensionRegistry();
    registry.register(searchExt);
    registry.register({ ...searchExt, name: "Updated" });
    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe("Updated");
  });
});
