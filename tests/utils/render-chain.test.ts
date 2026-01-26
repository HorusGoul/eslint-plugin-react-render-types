import { describe, it, expect } from "vitest";
import {
  canRenderComponent,
  resolveRenderChain,
} from "../../src/utils/render-chain.js";
import type { RendersAnnotation } from "../../src/types/index.js";

function makeAnnotation(
  componentName: string,
  modifier: RendersAnnotation["modifier"] = "required"
): RendersAnnotation {
  return {
    componentName,
    modifier,
    raw: `@renders${modifier === "optional" ? "?" : modifier === "many" ? "*" : ""} {${componentName}}`,
  };
}

describe("canRenderComponent", () => {
  describe("direct matching", () => {
    it("should return true for exact match", () => {
      const renderMap = new Map<string, RendersAnnotation>();
      expect(canRenderComponent("Header", "Header", renderMap)).toBe(true);
    });

    it("should return false for non-matching components", () => {
      const renderMap = new Map<string, RendersAnnotation>();
      expect(canRenderComponent("Footer", "Header", renderMap)).toBe(false);
    });

    it("should handle namespaced components", () => {
      const renderMap = new Map<string, RendersAnnotation>();
      expect(canRenderComponent("Menu.Item", "Menu.Item", renderMap)).toBe(
        true
      );
      expect(canRenderComponent("Menu.Item", "Menu.Header", renderMap)).toBe(
        false
      );
    });
  });

  describe("single-level chain", () => {
    it("should return true when component renders expected type", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["MyHeader", makeAnnotation("Header")],
      ]);
      expect(canRenderComponent("MyHeader", "Header", renderMap)).toBe(true);
    });

    it("should return false when component renders different type", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["MyFooter", makeAnnotation("Footer")],
      ]);
      expect(canRenderComponent("MyFooter", "Header", renderMap)).toBe(false);
    });
  });

  describe("multi-level chain", () => {
    it("should follow two-level chain", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["CustomHeader", makeAnnotation("MyHeader")],
        ["MyHeader", makeAnnotation("Header")],
      ]);
      expect(canRenderComponent("CustomHeader", "Header", renderMap)).toBe(
        true
      );
    });

    it("should follow three-level chain", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["A", makeAnnotation("B")],
        ["B", makeAnnotation("C")],
        ["C", makeAnnotation("D")],
      ]);
      expect(canRenderComponent("A", "D", renderMap)).toBe(true);
    });

    it("should return false for incomplete chain", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["A", makeAnnotation("B")],
        // B is not in the map
      ]);
      expect(canRenderComponent("A", "Header", renderMap)).toBe(false);
    });
  });

  describe("circular reference handling", () => {
    it("should handle direct circular reference", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["A", makeAnnotation("A")],
      ]);
      expect(canRenderComponent("A", "Header", renderMap)).toBe(false);
    });

    it("should handle indirect circular reference", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["A", makeAnnotation("B")],
        ["B", makeAnnotation("A")],
      ]);
      expect(canRenderComponent("A", "Header", renderMap)).toBe(false);
    });

    it("should handle longer circular reference", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["A", makeAnnotation("B")],
        ["B", makeAnnotation("C")],
        ["C", makeAnnotation("A")],
      ]);
      expect(canRenderComponent("A", "Header", renderMap)).toBe(false);
    });
  });

  describe("maxDepth limiting", () => {
    it("should respect maxDepth parameter", () => {
      const renderMap = new Map<string, RendersAnnotation>([
        ["A", makeAnnotation("B")],
        ["B", makeAnnotation("C")],
        ["C", makeAnnotation("D")],
      ]);
      // With maxDepth 2, can only go A -> B -> C
      expect(canRenderComponent("A", "D", renderMap, 2)).toBe(false);
      // With maxDepth 3, can go A -> B -> C -> D
      expect(canRenderComponent("A", "D", renderMap, 3)).toBe(true);
    });

    it("should use default maxDepth of 10", () => {
      // Create a chain of 11 components
      const renderMap = new Map<string, RendersAnnotation>();
      for (let i = 0; i < 10; i++) {
        renderMap.set(`C${i}`, makeAnnotation(`C${i + 1}`));
      }
      renderMap.set("C10", makeAnnotation("Target"));

      // Default maxDepth is 10, so this should not reach Target
      expect(canRenderComponent("C0", "Target", renderMap)).toBe(false);

      // With maxDepth 11, it should work
      expect(canRenderComponent("C0", "Target", renderMap, 11)).toBe(true);
    });
  });
});

describe("resolveRenderChain", () => {
  it("should return empty array for component not in map", () => {
    const renderMap = new Map<string, RendersAnnotation>();
    expect(resolveRenderChain("Header", renderMap)).toEqual([]);
  });

  it("should return single-element array for direct render", () => {
    const renderMap = new Map<string, RendersAnnotation>([
      ["MyHeader", makeAnnotation("Header")],
    ]);
    expect(resolveRenderChain("MyHeader", renderMap)).toEqual(["Header"]);
  });

  it("should return full chain for multi-level", () => {
    const renderMap = new Map<string, RendersAnnotation>([
      ["A", makeAnnotation("B")],
      ["B", makeAnnotation("C")],
      ["C", makeAnnotation("D")],
    ]);
    expect(resolveRenderChain("A", renderMap)).toEqual(["B", "C", "D"]);
  });

  it("should stop at circular reference", () => {
    const renderMap = new Map<string, RendersAnnotation>([
      ["A", makeAnnotation("B")],
      ["B", makeAnnotation("A")],
    ]);
    // Should stop when it sees A again
    expect(resolveRenderChain("A", renderMap)).toEqual(["B"]);
  });

  it("should respect maxDepth", () => {
    const renderMap = new Map<string, RendersAnnotation>([
      ["A", makeAnnotation("B")],
      ["B", makeAnnotation("C")],
      ["C", makeAnnotation("D")],
    ]);
    expect(resolveRenderChain("A", renderMap, 2)).toEqual(["B", "C"]);
  });
});
