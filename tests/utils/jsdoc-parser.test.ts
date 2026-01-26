import { describe, it, expect } from "vitest";
import { parseRendersAnnotation } from "../../src/utils/jsdoc-parser.js";

describe("parseRendersAnnotation", () => {
  describe("@renders {Component} - required", () => {
    it("should parse basic @renders annotation", () => {
      const result = parseRendersAnnotation("/** @renders {Header} */");
      expect(result).toEqual({
        componentName: "Header",
        modifier: "required",
        raw: "@renders {Header}",
      });
    });

    it("should parse @renders with multiline JSDoc", () => {
      const result = parseRendersAnnotation(`
        /**
         * My component description
         * @renders {Header}
         */
      `);
      expect(result).toEqual({
        componentName: "Header",
        modifier: "required",
        raw: "@renders {Header}",
      });
    });

    it("should handle namespaced components", () => {
      const result = parseRendersAnnotation("/** @renders {Menu.Item} */");
      expect(result).toEqual({
        componentName: "Menu.Item",
        modifier: "required",
        raw: "@renders {Menu.Item}",
      });
    });

    it("should handle deeply namespaced components", () => {
      const result = parseRendersAnnotation(
        "/** @renders {UI.Menu.Item.Label} */"
      );
      expect(result).toEqual({
        componentName: "UI.Menu.Item.Label",
        modifier: "required",
        raw: "@renders {UI.Menu.Item.Label}",
      });
    });
  });

  describe("@renders? {Component} - optional", () => {
    it("should parse optional @renders? annotation", () => {
      const result = parseRendersAnnotation("/** @renders? {Header} */");
      expect(result).toEqual({
        componentName: "Header",
        modifier: "optional",
        raw: "@renders? {Header}",
      });
    });

    it("should parse @renders? with multiline JSDoc", () => {
      const result = parseRendersAnnotation(`
        /**
         * Optional header component
         * @renders? {CardHeader}
         */
      `);
      expect(result).toEqual({
        componentName: "CardHeader",
        modifier: "optional",
        raw: "@renders? {CardHeader}",
      });
    });
  });

  describe("@renders* {Component} - many", () => {
    it("should parse many @renders* annotation", () => {
      const result = parseRendersAnnotation("/** @renders* {MenuItem} */");
      expect(result).toEqual({
        componentName: "MenuItem",
        modifier: "many",
        raw: "@renders* {MenuItem}",
      });
    });

    it("should parse @renders* with multiline JSDoc", () => {
      const result = parseRendersAnnotation(`
        /**
         * Renders multiple menu items
         * @renders* {Menu.Item}
         */
      `);
      expect(result).toEqual({
        componentName: "Menu.Item",
        modifier: "many",
        raw: "@renders* {Menu.Item}",
      });
    });
  });

  describe("edge cases", () => {
    it("should return null for no @renders annotation", () => {
      const result = parseRendersAnnotation("/** @param foo */");
      expect(result).toBeNull();
    });

    it("should return null for empty comment", () => {
      const result = parseRendersAnnotation("/** */");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseRendersAnnotation("");
      expect(result).toBeNull();
    });

    it("should return null for malformed annotation without braces", () => {
      const result = parseRendersAnnotation("/** @renders Header */");
      expect(result).toBeNull();
    });

    it("should return null for malformed annotation with empty braces", () => {
      const result = parseRendersAnnotation("/** @renders {} */");
      expect(result).toBeNull();
    });

    it("should return null for malformed annotation with missing closing brace", () => {
      const result = parseRendersAnnotation("/** @renders {Header */");
      expect(result).toBeNull();
    });

    it("should handle whitespace variations", () => {
      const result = parseRendersAnnotation("/**  @renders  {  Header  }  */");
      expect(result?.componentName).toBe("Header");
      expect(result?.modifier).toBe("required");
    });

    it("should handle no space after @renders", () => {
      const result = parseRendersAnnotation("/** @renders{Header} */");
      expect(result?.componentName).toBe("Header");
    });

    it("should handle tabs and mixed whitespace", () => {
      const result = parseRendersAnnotation("/**\t@renders\t{\tHeader\t}\t*/");
      expect(result?.componentName).toBe("Header");
    });

    it("should use first @renders if multiple present", () => {
      const result = parseRendersAnnotation(`
        /**
         * @renders {Header}
         * @renders {Footer}
         */
      `);
      expect(result?.componentName).toBe("Header");
    });

    it("should not match @renders in middle of word", () => {
      const result = parseRendersAnnotation("/** pre@renders {Header} */");
      expect(result).toBeNull();
    });

    it("should match @renders at start of line in multiline", () => {
      const result = parseRendersAnnotation(`/**
 * @renders {Header}
 */`);
      expect(result?.componentName).toBe("Header");
    });
  });

  describe("with other JSDoc tags", () => {
    it("should parse @renders among other tags", () => {
      const result = parseRendersAnnotation(`
        /**
         * A custom header component
         * @param {string} title - The title
         * @renders {Header}
         * @returns {JSX.Element}
         */
      `);
      expect(result).toEqual({
        componentName: "Header",
        modifier: "required",
        raw: "@renders {Header}",
      });
    });

    it("should parse @renders? among other tags", () => {
      const result = parseRendersAnnotation(`
        /**
         * @deprecated Use NewHeader instead
         * @renders? {Header}
         */
      `);
      expect(result).toEqual({
        componentName: "Header",
        modifier: "optional",
        raw: "@renders? {Header}",
      });
    });
  });
});
