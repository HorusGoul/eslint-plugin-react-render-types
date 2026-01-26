import { describe, it, expect } from "vitest";
import {
  isComponentName,
  getJSXElementName,
} from "../../src/utils/component-utils.js";

describe("isComponentName", () => {
  describe("valid component names", () => {
    it("should return true for PascalCase names", () => {
      expect(isComponentName("Header")).toBe(true);
      expect(isComponentName("MyComponent")).toBe(true);
      expect(isComponentName("A")).toBe(true);
    });

    it("should return true for names with numbers", () => {
      expect(isComponentName("Header2")).toBe(true);
      expect(isComponentName("H1")).toBe(true);
    });
  });

  describe("invalid component names", () => {
    it("should return false for lowercase names (HTML elements)", () => {
      expect(isComponentName("div")).toBe(false);
      expect(isComponentName("span")).toBe(false);
      expect(isComponentName("header")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isComponentName("")).toBe(false);
    });

    it("should return false for names starting with numbers", () => {
      expect(isComponentName("1Component")).toBe(false);
    });
  });
});

describe("getJSXElementName", () => {
  // Note: These tests use mock AST node structures
  // In real usage, these come from the ESLint parser

  describe("simple element names", () => {
    it("should return name for simple JSX identifier", () => {
      const node = {
        type: "JSXElement",
        openingElement: {
          type: "JSXOpeningElement",
          name: {
            type: "JSXIdentifier",
            name: "Header",
          },
        },
      } as const;
      expect(getJSXElementName(node as any)).toBe("Header");
    });

    it("should return name for lowercase element", () => {
      const node = {
        type: "JSXElement",
        openingElement: {
          type: "JSXOpeningElement",
          name: {
            type: "JSXIdentifier",
            name: "div",
          },
        },
      } as const;
      expect(getJSXElementName(node as any)).toBe("div");
    });
  });

  describe("namespaced element names", () => {
    it("should return full name for member expression", () => {
      // <Menu.Item />
      const node = {
        type: "JSXElement",
        openingElement: {
          type: "JSXOpeningElement",
          name: {
            type: "JSXMemberExpression",
            object: {
              type: "JSXIdentifier",
              name: "Menu",
            },
            property: {
              type: "JSXIdentifier",
              name: "Item",
            },
          },
        },
      } as const;
      expect(getJSXElementName(node as any)).toBe("Menu.Item");
    });

    it("should return full name for deeply nested member expression", () => {
      // <UI.Menu.Item />
      const node = {
        type: "JSXElement",
        openingElement: {
          type: "JSXOpeningElement",
          name: {
            type: "JSXMemberExpression",
            object: {
              type: "JSXMemberExpression",
              object: {
                type: "JSXIdentifier",
                name: "UI",
              },
              property: {
                type: "JSXIdentifier",
                name: "Menu",
              },
            },
            property: {
              type: "JSXIdentifier",
              name: "Item",
            },
          },
        },
      } as const;
      expect(getJSXElementName(node as any)).toBe("UI.Menu.Item");
    });
  });

  describe("edge cases", () => {
    it("should return null for JSXNamespacedName (XML-style)", () => {
      // <svg:rect /> - XML namespace syntax (rare in React)
      const node = {
        type: "JSXElement",
        openingElement: {
          type: "JSXOpeningElement",
          name: {
            type: "JSXNamespacedName",
            namespace: { type: "JSXIdentifier", name: "svg" },
            name: { type: "JSXIdentifier", name: "rect" },
          },
        },
      } as const;
      expect(getJSXElementName(node as any)).toBeNull();
    });
  });
});
