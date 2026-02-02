import { describe, it, expect } from "vitest";

/**
 * Replicate the getRendersComponentNames logic from the TS plugin
 * to test the regex extraction independently.
 * This must stay in sync with src/language-service-plugin.ts.
 */
function getRendersComponentNames(sourceText: string): Set<string> {
  const regex =
    /(?:^|[^a-zA-Z@])@renders(?:\?|\*)?(?:!)?\s*\{\s*([^}]+)\s*\}/g;
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceText)) !== null) {
    const typeExpr = match[1];
    for (const part of typeExpr.split("|")) {
      const name = part.trim().split(".")[0];
      if (name && /^[A-Z]/.test(name)) {
        names.add(name);
      }
    }
  }
  return names;
}

describe("getRendersComponentNames", () => {
  it("extracts single component", () => {
    const text = `
      import { Header } from "./Header";
      /** @renders {Header} */
      function MyHeader() {}
    `;
    expect(getRendersComponentNames(text)).toEqual(new Set(["Header"]));
  });

  it("extracts union types", () => {
    const text = `/** @renders {Header | Footer} */`;
    expect(getRendersComponentNames(text)).toEqual(
      new Set(["Header", "Footer"])
    );
  });

  it("extracts namespaced components (base name)", () => {
    const text = `/** @renders {Menu.Item} */`;
    expect(getRendersComponentNames(text)).toEqual(new Set(["Menu"]));
  });

  it("handles optional modifier", () => {
    const text = `/** @renders? {Header} */`;
    expect(getRendersComponentNames(text)).toEqual(new Set(["Header"]));
  });

  it("handles many modifier", () => {
    const text = `/** @renders* {Header} */`;
    expect(getRendersComponentNames(text)).toEqual(new Set(["Header"]));
  });

  it("handles unchecked modifier", () => {
    const text = `/** @renders! {Header} */`;
    expect(getRendersComponentNames(text)).toEqual(new Set(["Header"]));
  });

  it("handles combined modifier and unchecked", () => {
    const text = `/** @renders*! {Header} */`;
    expect(getRendersComponentNames(text)).toEqual(new Set(["Header"]));
  });

  it("extracts from multiple annotations in same file", () => {
    const text = `
      /** @renders {Header} */
      function A() {}
      /** @renders {Footer} */
      function B() {}
    `;
    expect(getRendersComponentNames(text)).toEqual(
      new Set(["Header", "Footer"])
    );
  });

  it("extracts from interface prop annotations", () => {
    const text = `
      interface Props {
        /** @renders {NavItem} */
        children: React.ReactNode;
        /** @renders* {Header | Footer} */
        header: React.ReactNode;
      }
    `;
    expect(getRendersComponentNames(text)).toEqual(
      new Set(["NavItem", "Header", "Footer"])
    );
  });

  it("returns empty set for no annotations", () => {
    const text = `
      import { Header } from "./Header";
      function MyComponent() { return <div />; }
    `;
    expect(getRendersComponentNames(text)).toEqual(new Set());
  });

  it("ignores lowercase names", () => {
    const text = `/** @renders {header} */`;
    expect(getRendersComponentNames(text)).toEqual(new Set());
  });

  it("handles whitespace variations", () => {
    const text = `/**  @renders  {  Header  |  Footer  }  */`;
    expect(getRendersComponentNames(text)).toEqual(
      new Set(["Header", "Footer"])
    );
  });
});
