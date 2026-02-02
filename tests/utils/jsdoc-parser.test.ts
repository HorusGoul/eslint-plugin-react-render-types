import { describe, it, expect } from "vitest";
import { parseRendersAnnotation, parseTransparentAnnotation } from "../../src/utils/jsdoc-parser.js";

describe("parseRendersAnnotation", () => {
  describe("@renders {Component} - required", () => {
    it("should parse basic @renders annotation", () => {
      const result = parseRendersAnnotation("/** @renders {Header} */");
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header"],
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
        componentNames: ["Header"],
        modifier: "required",
        raw: "@renders {Header}",
      });
    });

    it("should handle namespaced components", () => {
      const result = parseRendersAnnotation("/** @renders {Menu.Item} */");
      expect(result).toEqual({
        componentName: "Menu.Item",
        componentNames: ["Menu.Item"],
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
        componentNames: ["UI.Menu.Item.Label"],
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
        componentNames: ["Header"],
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
        componentNames: ["CardHeader"],
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
        componentNames: ["MenuItem"],
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
        componentNames: ["Menu.Item"],
        modifier: "many",
        raw: "@renders* {Menu.Item}",
      });
    });
  });

  describe("@renders {A | B} - union types", () => {
    it("should parse simple union type", () => {
      const result = parseRendersAnnotation("/** @renders {Header | Footer} */");
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header", "Footer"],
        modifier: "required",
        raw: "@renders {Header | Footer}",
      });
    });

    it("should parse union type with three components", () => {
      const result = parseRendersAnnotation(
        "/** @renders {Header | Sidebar | Footer} */"
      );
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header", "Sidebar", "Footer"],
        modifier: "required",
        raw: "@renders {Header | Sidebar | Footer}",
      });
    });

    it("should parse union type with namespaced components", () => {
      const result = parseRendersAnnotation(
        "/** @renders {Menu.Header | Menu.Footer} */"
      );
      expect(result).toEqual({
        componentName: "Menu.Header",
        componentNames: ["Menu.Header", "Menu.Footer"],
        modifier: "required",
        raw: "@renders {Menu.Header | Menu.Footer}",
      });
    });

    it("should parse optional union type", () => {
      const result = parseRendersAnnotation(
        "/** @renders? {Header | Footer} */"
      );
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header", "Footer"],
        modifier: "optional",
        raw: "@renders? {Header | Footer}",
      });
    });

    it("should parse many union type", () => {
      const result = parseRendersAnnotation(
        "/** @renders* {MenuItem | Divider} */"
      );
      expect(result).toEqual({
        componentName: "MenuItem",
        componentNames: ["MenuItem", "Divider"],
        modifier: "many",
        raw: "@renders* {MenuItem | Divider}",
      });
    });

    it("should handle whitespace variations in union", () => {
      const result = parseRendersAnnotation(
        "/** @renders {Header|Footer} */"
      );
      expect(result?.componentNames).toEqual(["Header", "Footer"]);
    });

    it("should handle extra whitespace in union", () => {
      const result = parseRendersAnnotation(
        "/** @renders {Header  |  Footer} */"
      );
      expect(result?.componentNames).toEqual(["Header", "Footer"]);
    });

    it("should parse union type in multiline JSDoc", () => {
      const result = parseRendersAnnotation(`
        /**
         * Can render either header or footer
         * @renders {Header | Footer}
         */
      `);
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header", "Footer"],
        modifier: "required",
        raw: "@renders {Header | Footer}",
      });
    });

    it("should parse union type with five components", () => {
      const result = parseRendersAnnotation(
        "/** @renders {Header | Sidebar | Content | Footer | Navigation} */"
      );
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header", "Sidebar", "Content", "Footer", "Navigation"],
        modifier: "required",
        raw: "@renders {Header | Sidebar | Content | Footer | Navigation}",
      });
    });

    it("should parse large union type with seven components", () => {
      const result = parseRendersAnnotation(
        "/** @renders {A | B | C | D | E | F | G} */"
      );
      expect(result).toEqual({
        componentName: "A",
        componentNames: ["A", "B", "C", "D", "E", "F", "G"],
        modifier: "required",
        raw: "@renders {A | B | C | D | E | F | G}",
      });
    });

    it("should parse large union with mixed namespaced components", () => {
      const result = parseRendersAnnotation(
        "/** @renders {UI.Header | UI.Footer | Card | Button | UI.Sidebar} */"
      );
      expect(result).toEqual({
        componentName: "UI.Header",
        componentNames: ["UI.Header", "UI.Footer", "Card", "Button", "UI.Sidebar"],
        modifier: "required",
        raw: "@renders {UI.Header | UI.Footer | Card | Button | UI.Sidebar}",
      });
    });

    it("should parse optional large union type", () => {
      const result = parseRendersAnnotation(
        "/** @renders? {Header | Sidebar | Content | Footer} */"
      );
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header", "Sidebar", "Content", "Footer"],
        modifier: "optional",
        raw: "@renders? {Header | Sidebar | Content | Footer}",
      });
    });

    it("should parse many modifier with large union type", () => {
      const result = parseRendersAnnotation(
        "/** @renders* {MenuItem | Divider | SubMenu | MenuGroup} */"
      );
      expect(result).toEqual({
        componentName: "MenuItem",
        componentNames: ["MenuItem", "Divider", "SubMenu", "MenuGroup"],
        modifier: "many",
        raw: "@renders* {MenuItem | Divider | SubMenu | MenuGroup}",
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

    it("should return null for invalid component names in union", () => {
      const result = parseRendersAnnotation("/** @renders {header | footer} */");
      expect(result).toBeNull();
    });

    it("should return null for union with lowercase component", () => {
      const result = parseRendersAnnotation("/** @renders {Header | footer} */");
      expect(result).toBeNull();
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
        componentNames: ["Header"],
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
        componentNames: ["Header"],
        modifier: "optional",
        raw: "@renders? {Header}",
      });
    });

    it("should parse union type among other tags", () => {
      const result = parseRendersAnnotation(`
        /**
         * A flexible component
         * @param {string} variant - The variant
         * @renders {Header | Footer}
         */
      `);
      expect(result).toEqual({
        componentName: "Header",
        componentNames: ["Header", "Footer"],
        modifier: "required",
        raw: "@renders {Header | Footer}",
      });
    });
  });
});

describe("parseTransparentAnnotation", () => {
  it("should parse bare @transparent as children default", () => {
    expect(parseTransparentAnnotation("/** @transparent */")).toEqual({
      propNames: ["children"],
    });
  });

  it("should parse @transparent in multiline block comment", () => {
    expect(
      parseTransparentAnnotation(`
        /**
         * A wrapper component
         * @transparent
         */
      `)
    ).toEqual({ propNames: ["children"] });
  });

  it("should return null when @transparent is absent", () => {
    expect(parseTransparentAnnotation("/** @renders {Header} */")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseTransparentAnnotation("")).toBeNull();
  });

  it("should return null for empty comment", () => {
    expect(parseTransparentAnnotation("/** */")).toBeNull();
  });

  it("should not match @transparent in middle of word", () => {
    expect(parseTransparentAnnotation("/** pre@transparent */")).toBeNull();
  });

  it("should not match @transparently", () => {
    expect(parseTransparentAnnotation("/** @transparently */")).toBeNull();
  });

  it("should detect @transparent alongside @renders", () => {
    const comment = `
      /**
       * @transparent
       * @renders {Header}
       */
    `;
    expect(parseTransparentAnnotation(comment)).toEqual({
      propNames: ["children"],
    });
    expect(parseRendersAnnotation(comment)).not.toBeNull();
  });

  it("should parse @transparent in line comment", () => {
    expect(parseTransparentAnnotation("@transparent")).toEqual({
      propNames: ["children"],
    });
  });

  // --- Named prop syntax ---

  it("should parse @transparent {children} as explicit children", () => {
    expect(
      parseTransparentAnnotation("/** @transparent {children} */")
    ).toEqual({ propNames: ["children"] });
  });

  it("should parse @transparent with named props", () => {
    expect(
      parseTransparentAnnotation("/** @transparent {off, children} */")
    ).toEqual({ propNames: ["off", "children"] });
  });

  it("should parse @transparent with single named prop", () => {
    expect(
      parseTransparentAnnotation("/** @transparent {fallback} */")
    ).toEqual({ propNames: ["fallback"] });
  });

  it("should handle whitespace in prop list", () => {
    expect(
      parseTransparentAnnotation("/** @transparent { off , children } */")
    ).toEqual({ propNames: ["off", "children"] });
  });

  it("should parse @transparent with props in multiline JSDoc", () => {
    expect(
      parseTransparentAnnotation(
        `/**\n * @transparent {off, children}\n */`
      )
    ).toEqual({ propNames: ["off", "children"] });
  });

  it("should default empty braces to children", () => {
    expect(
      parseTransparentAnnotation("/** @transparent {} */")
    ).toEqual({ propNames: ["children"] });
  });

  it("should parse @transparent {props} alongside @renders", () => {
    const comment =
      "/** @transparent {fallback, children}\n * @renders {Header} */";
    expect(parseTransparentAnnotation(comment)).toEqual({
      propNames: ["fallback", "children"],
    });
    expect(parseRendersAnnotation(comment)).not.toBeNull();
  });
});

describe("@renders! unchecked flag", () => {
  it("should parse @renders! with unchecked flag", () => {
    const result = parseRendersAnnotation("/** @renders! {Header} */");
    expect(result).toEqual({
      componentName: "Header",
      componentNames: ["Header"],
      modifier: "required",
      raw: "@renders! {Header}",
      unchecked: true,
    });
  });

  it("should parse @renders?! (optional + unchecked)", () => {
    const result = parseRendersAnnotation("/** @renders?! {Header} */");
    expect(result).toEqual({
      componentName: "Header",
      componentNames: ["Header"],
      modifier: "optional",
      raw: "@renders?! {Header}",
      unchecked: true,
    });
  });

  it("should parse @renders*! (many + unchecked)", () => {
    const result = parseRendersAnnotation("/** @renders*! {MenuItem} */");
    expect(result).toEqual({
      componentName: "MenuItem",
      componentNames: ["MenuItem"],
      modifier: "many",
      raw: "@renders*! {MenuItem}",
      unchecked: true,
    });
  });

  it("should parse @renders! with union types", () => {
    const result = parseRendersAnnotation(
      "/** @renders! {Header | Footer} */"
    );
    expect(result).toEqual({
      componentName: "Header",
      componentNames: ["Header", "Footer"],
      modifier: "required",
      raw: "@renders! {Header | Footer}",
      unchecked: true,
    });
  });

  it("should not set unchecked for regular @renders", () => {
    const result = parseRendersAnnotation("/** @renders {Header} */");
    expect(result?.unchecked).toBeUndefined();
  });
});
