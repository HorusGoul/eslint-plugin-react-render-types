import { describe, it, expect } from "vitest";
import {
  canRenderComponentTyped,
  resolveRenderChain,
} from "../../src/utils/render-chain.js";
import type { ResolvedRendersAnnotation, ResolvedRenderMap } from "../../src/types/index.js";

function makeAnnotation(
  componentName: string,
  modifier: ResolvedRendersAnnotation["modifier"] = "required",
  targetTypeId?: string
): ResolvedRendersAnnotation {
  return {
    componentName,
    modifier,
    raw: `@renders${modifier === "optional" ? "?" : modifier === "many" ? "*" : ""} {${componentName}}`,
    targetTypeId,
  };
}

describe("canRenderComponentTyped", () => {
  describe("direct type ID matching", () => {
    it("should return true for exact type ID match", () => {
      const renderMap: ResolvedRenderMap = new Map();
      expect(
        canRenderComponentTyped("Header", "Header", renderMap, {
          actualTypeId: "/path/Header.tsx:Header",
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(true);
    });

    it("should return false for different type IDs with same name", () => {
      const renderMap: ResolvedRenderMap = new Map();
      expect(
        canRenderComponentTyped("Header", "Header", renderMap, {
          actualTypeId: "/path/a/Header.tsx:Header",
          expectedTypeId: "/path/b/Header.tsx:Header",
        })
      ).toBe(false);
    });

    it("should return false when no type IDs provided", () => {
      const renderMap: ResolvedRenderMap = new Map();
      expect(canRenderComponentTyped("Header", "Header", renderMap, {})).toBe(
        false
      );
    });
  });

  describe("single-level chain with type IDs", () => {
    it("should return true when annotation targetTypeId matches expectedTypeId", () => {
      const renderMap: ResolvedRenderMap = new Map([
        [
          "MyHeader",
          makeAnnotation("Header", "required", "/path/Header.tsx:Header"),
        ],
      ]);
      expect(
        canRenderComponentTyped("MyHeader", "Header", renderMap, {
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(true);
    });

    it("should return false when annotation targetTypeId does not match", () => {
      const renderMap: ResolvedRenderMap = new Map([
        [
          "MyFooter",
          makeAnnotation("Footer", "required", "/path/Footer.tsx:Footer"),
        ],
      ]);
      expect(
        canRenderComponentTyped("MyFooter", "Header", renderMap, {
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(false);
    });
  });

  describe("multi-level chain with type IDs", () => {
    it("should follow two-level chain", () => {
      const renderMap: ResolvedRenderMap = new Map([
        [
          "CustomHeader",
          makeAnnotation("MyHeader", "required", "/path/MyHeader.tsx:MyHeader"),
        ],
        [
          "MyHeader",
          makeAnnotation("Header", "required", "/path/Header.tsx:Header"),
        ],
      ]);
      expect(
        canRenderComponentTyped("CustomHeader", "Header", renderMap, {
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(true);
    });

    it("should follow three-level chain", () => {
      const renderMap: ResolvedRenderMap = new Map([
        ["A", makeAnnotation("B", "required", "/path/B.tsx:B")],
        ["B", makeAnnotation("C", "required", "/path/C.tsx:C")],
        ["C", makeAnnotation("D", "required", "/path/D.tsx:D")],
      ]);
      expect(
        canRenderComponentTyped("A", "D", renderMap, {
          expectedTypeId: "/path/D.tsx:D",
        })
      ).toBe(true);
    });

    it("should return false for incomplete chain", () => {
      const renderMap: ResolvedRenderMap = new Map([
        ["A", makeAnnotation("B", "required", "/path/B.tsx:B")],
        // B is not in the map
      ]);
      expect(
        canRenderComponentTyped("A", "Header", renderMap, {
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(false);
    });
  });

  describe("circular reference handling", () => {
    it("should handle direct circular reference", () => {
      const renderMap: ResolvedRenderMap = new Map([
        ["A", makeAnnotation("A", "required", "/path/A.tsx:A")],
      ]);
      expect(
        canRenderComponentTyped("A", "Header", renderMap, {
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(false);
    });

    it("should handle indirect circular reference", () => {
      const renderMap: ResolvedRenderMap = new Map([
        ["A", makeAnnotation("B", "required", "/path/B.tsx:B")],
        ["B", makeAnnotation("A", "required", "/path/A.tsx:A")],
      ]);
      expect(
        canRenderComponentTyped("A", "Header", renderMap, {
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(false);
    });

    it("should handle longer circular reference", () => {
      const renderMap: ResolvedRenderMap = new Map([
        ["A", makeAnnotation("B", "required", "/path/B.tsx:B")],
        ["B", makeAnnotation("C", "required", "/path/C.tsx:C")],
        ["C", makeAnnotation("A", "required", "/path/A.tsx:A")],
      ]);
      expect(
        canRenderComponentTyped("A", "Header", renderMap, {
          expectedTypeId: "/path/Header.tsx:Header",
        })
      ).toBe(false);
    });
  });

  describe("maxDepth limiting", () => {
    it("should respect maxDepth parameter", () => {
      const renderMap: ResolvedRenderMap = new Map([
        ["A", makeAnnotation("B", "required", "/path/B.tsx:B")],
        ["B", makeAnnotation("C", "required", "/path/C.tsx:C")],
        ["C", makeAnnotation("D", "required", "/path/D.tsx:D")],
      ]);
      // With maxDepth 2, can only go A -> B -> C
      expect(
        canRenderComponentTyped(
          "A",
          "D",
          renderMap,
          { expectedTypeId: "/path/D.tsx:D" },
          2
        )
      ).toBe(false);
      // With maxDepth 3, can go A -> B -> C -> D
      expect(
        canRenderComponentTyped(
          "A",
          "D",
          renderMap,
          { expectedTypeId: "/path/D.tsx:D" },
          3
        )
      ).toBe(true);
    });

    it("should use default maxDepth of 10", () => {
      // Create a chain of 11 components
      const renderMap: ResolvedRenderMap = new Map();
      for (let i = 0; i < 10; i++) {
        renderMap.set(
          `C${i}`,
          makeAnnotation(`C${i + 1}`, "required", `/path/C${i + 1}.tsx:C${i + 1}`)
        );
      }
      renderMap.set(
        "C10",
        makeAnnotation("Target", "required", "/path/Target.tsx:Target")
      );

      // Default maxDepth is 10, so this should not reach Target
      expect(
        canRenderComponentTyped("C0", "Target", renderMap, {
          expectedTypeId: "/path/Target.tsx:Target",
        })
      ).toBe(false);

      // With maxDepth 11, it should work
      expect(
        canRenderComponentTyped(
          "C0",
          "Target",
          renderMap,
          { expectedTypeId: "/path/Target.tsx:Target" },
          11
        )
      ).toBe(true);
    });
  });
});

describe("resolveRenderChain", () => {
  it("should return empty array for component not in map", () => {
    const renderMap: ResolvedRenderMap = new Map();
    expect(resolveRenderChain("Header", renderMap)).toEqual([]);
  });

  it("should return single-element array for direct render", () => {
    const renderMap: ResolvedRenderMap = new Map([
      ["MyHeader", makeAnnotation("Header")],
    ]);
    expect(resolveRenderChain("MyHeader", renderMap)).toEqual(["Header"]);
  });

  it("should return full chain for multi-level", () => {
    const renderMap: ResolvedRenderMap = new Map([
      ["A", makeAnnotation("B")],
      ["B", makeAnnotation("C")],
      ["C", makeAnnotation("D")],
    ]);
    expect(resolveRenderChain("A", renderMap)).toEqual(["B", "C", "D"]);
  });

  it("should stop at circular reference", () => {
    const renderMap: ResolvedRenderMap = new Map([
      ["A", makeAnnotation("B")],
      ["B", makeAnnotation("A")],
    ]);
    // Should stop when it sees A again
    expect(resolveRenderChain("A", renderMap)).toEqual(["B"]);
  });

  it("should respect maxDepth", () => {
    const renderMap: ResolvedRenderMap = new Map([
      ["A", makeAnnotation("B")],
      ["B", makeAnnotation("C")],
      ["C", makeAnnotation("D")],
    ]);
    expect(resolveRenderChain("A", renderMap, 2)).toEqual(["B", "C"]);
  });
});
