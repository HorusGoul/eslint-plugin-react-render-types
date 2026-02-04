import { describe, it, expect } from "vitest";
import ts from "typescript";

/**
 * Replicate the diagnostic name extraction logic from isRendersReferencedImport.
 * When a single-specifier import is unused, TypeScript's diagnostic spans the
 * entire import declaration, not just the identifier. We extract the name from
 * the message text ("'{name}' is declared but...") instead.
 */
function extractNameFromDiagnostic(messageText: string | { messageText: string }, spanText: string): string {
  const msg = typeof messageText === "string" ? messageText : messageText.messageText;
  const match = msg.match(/^'([^']+)'/);
  if (match) return match[1];
  return spanText;
}

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

describe("extractNameFromDiagnostic", () => {
  it("extracts name from string message when span is entire import", () => {
    expect(
      extractNameFromDiagnostic(
        "'NavItem' is declared but its value is never read.",
        'import { NavItem } from "@/design-system/nav/NavItem"',
      ),
    ).toBe("NavItem");
  });

  it("extracts name from DiagnosticMessageChain", () => {
    expect(
      extractNameFromDiagnostic(
        { messageText: "'NavSection' is declared but never used." },
        'import { NavSection } from "./NavSection"',
      ),
    ).toBe("NavSection");
  });

  it("falls back to span text when message has no quoted name", () => {
    expect(
      extractNameFromDiagnostic("some unexpected message", "Header"),
    ).toBe("Header");
  });
});

// ---- Go-to-definition helpers (replicated from src/language-service-plugin.ts) ----

interface RendersComponentSpan {
  name: string;
  fullName: string;
  start: number;
  length: number;
}

/**
 * Replicate getRendersComponentSpans from the TS plugin for unit testing.
 * Must stay in sync with src/language-service-plugin.ts.
 */
function getRendersComponentSpans(sourceText: string): RendersComponentSpan[] {
  const regex = /(?:^|[^a-zA-Z@])@renders(?:\?|\*)?(?:!)?\s*\{\s*([^}]+)\s*\}/g;
  const spans: RendersComponentSpan[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceText)) !== null) {
    const typeExpr = match[1];
    const typeExprStart = match.index + match[0].indexOf(typeExpr);

    let offset = 0;
    for (const part of typeExpr.split("|")) {
      const partStart = typeExpr.indexOf(part, offset);
      const trimmed = part.trimStart();
      const leadingSpaces = part.length - trimmed.length;
      const fullName = trimmed.trimEnd();

      if (fullName && /^[A-Z]/.test(fullName)) {
        const absoluteStart = typeExprStart + partStart + leadingSpaces;
        spans.push({
          name: fullName.split(".")[0],
          fullName,
          start: absoluteStart,
          length: fullName.length,
        });
      }

      offset = partStart + part.length;
    }
  }
  return spans;
}

/**
 * Replicate findImportIdentifierPosition from the TS plugin for unit testing.
 * Must stay in sync with src/language-service-plugin.ts.
 */
function findImportIdentifierPosition(
  sourceFile: ts.SourceFile,
  targetName: string,
): number | null {
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const clause = stmt.importClause;
    if (!clause) continue;

    if (clause.name && clause.name.text === targetName) {
      return clause.name.getStart(sourceFile);
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      if (bindings.name.text === targetName) {
        return bindings.name.getStart(sourceFile);
      }
    }

    if (ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.name.text === targetName) {
          return element.name.getStart(sourceFile);
        }
      }
    }
  }
  return null;
}

describe("getRendersComponentSpans", () => {
  it("extracts single component with correct position", () => {
    const text = `/** @renders {Header} */`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("Header");
    expect(spans[0].fullName).toBe("Header");
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Header");
  });

  it("extracts union types with correct positions", () => {
    const text = `/** @renders {Header | Footer} */`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(2);
    expect(spans[0].name).toBe("Header");
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Header");
    expect(spans[1].name).toBe("Footer");
    expect(text.substring(spans[1].start, spans[1].start + spans[1].length)).toBe("Footer");
  });

  it("extracts namespaced component", () => {
    const text = `/** @renders {Menu.Item} */`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("Menu");
    expect(spans[0].fullName).toBe("Menu.Item");
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Menu.Item");
  });

  it("handles optional modifier", () => {
    const text = `/** @renders? {Header} */`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(1);
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Header");
  });

  it("handles many modifier", () => {
    const text = `/** @renders* {Header} */`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(1);
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Header");
  });

  it("handles unchecked modifier", () => {
    const text = `/** @renders! {Header} */`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(1);
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Header");
  });

  it("handles whitespace variations", () => {
    const text = `/**  @renders  {  Header  |  Footer  }  */`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(2);
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Header");
    expect(text.substring(spans[1].start, spans[1].start + spans[1].length)).toBe("Footer");
  });

  it("handles multiple annotations in same file", () => {
    const text = `/** @renders {Header} */
function A() {}
/** @renders {Footer} */
function B() {}`;
    const spans = getRendersComponentSpans(text);
    expect(spans).toHaveLength(2);
    expect(spans[0].name).toBe("Header");
    expect(text.substring(spans[0].start, spans[0].start + spans[0].length)).toBe("Header");
    expect(spans[1].name).toBe("Footer");
    expect(text.substring(spans[1].start, spans[1].start + spans[1].length)).toBe("Footer");
  });

  it("returns empty array for no annotations", () => {
    const text = `function MyComponent() { return null; }`;
    expect(getRendersComponentSpans(text)).toEqual([]);
  });

  it("ignores lowercase names", () => {
    const text = `/** @renders {header} */`;
    expect(getRendersComponentSpans(text)).toEqual([]);
  });

  describe("hit detection", () => {
    it("finds span when cursor is at start of name", () => {
      const text = `/** @renders {Header} */`;
      const spans = getRendersComponentSpans(text);
      const pos = text.indexOf("Header");
      const hit = spans.find((s) => pos >= s.start && pos < s.start + s.length);
      expect(hit?.name).toBe("Header");
    });

    it("finds span when cursor is in middle of name", () => {
      const text = `/** @renders {Header} */`;
      const spans = getRendersComponentSpans(text);
      const pos = text.indexOf("Header") + 3;
      const hit = spans.find((s) => pos >= s.start && pos < s.start + s.length);
      expect(hit?.name).toBe("Header");
    });

    it("does not find span when cursor is on brace", () => {
      const text = `/** @renders {Header} */`;
      const spans = getRendersComponentSpans(text);
      const pos = text.indexOf("{");
      const hit = spans.find((s) => pos >= s.start && pos < s.start + s.length);
      expect(hit).toBeUndefined();
    });

    it("does not find span when cursor is on pipe", () => {
      const text = `/** @renders {Header | Footer} */`;
      const spans = getRendersComponentSpans(text);
      const pos = text.indexOf("|");
      const hit = spans.find((s) => pos >= s.start && pos < s.start + s.length);
      expect(hit).toBeUndefined();
    });

    it("finds correct span in union type", () => {
      const text = `/** @renders {Header | Footer} */`;
      const spans = getRendersComponentSpans(text);
      const pos = text.indexOf("Footer");
      const hit = spans.find((s) => pos >= s.start && pos < s.start + s.length);
      expect(hit?.name).toBe("Footer");
    });
  });
});

describe("findImportIdentifierPosition", () => {
  function createSourceFile(code: string): ts.SourceFile {
    return ts.createSourceFile("test.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  }

  it("finds named import", () => {
    const sf = createSourceFile(`import { Header } from "./Header";`);
    const pos = findImportIdentifierPosition(sf, "Header");
    expect(pos).not.toBeNull();
    expect(sf.text.substring(pos!, pos! + "Header".length)).toBe("Header");
  });

  it("finds default import", () => {
    const sf = createSourceFile(`import Menu from "./Menu";`);
    const pos = findImportIdentifierPosition(sf, "Menu");
    expect(pos).not.toBeNull();
    expect(sf.text.substring(pos!, pos! + "Menu".length)).toBe("Menu");
  });

  it("finds namespace import", () => {
    const sf = createSourceFile(`import * as UI from "./ui";`);
    const pos = findImportIdentifierPosition(sf, "UI");
    expect(pos).not.toBeNull();
    expect(sf.text.substring(pos!, pos! + "UI".length)).toBe("UI");
  });

  it("finds aliased import by local name", () => {
    const sf = createSourceFile(`import { Header as MyHeader } from "./Header";`);
    const pos = findImportIdentifierPosition(sf, "MyHeader");
    expect(pos).not.toBeNull();
    expect(sf.text.substring(pos!, pos! + "MyHeader".length)).toBe("MyHeader");
  });

  it("returns null when import not found", () => {
    const sf = createSourceFile(`import { Footer } from "./Footer";`);
    const pos = findImportIdentifierPosition(sf, "Header");
    expect(pos).toBeNull();
  });

  it("finds import among multiple specifiers", () => {
    const sf = createSourceFile(`import { Header, Footer, Sidebar } from "./components";`);
    const pos = findImportIdentifierPosition(sf, "Footer");
    expect(pos).not.toBeNull();
    expect(sf.text.substring(pos!, pos! + "Footer".length)).toBe("Footer");
  });
});

// ---- Hover tag formatting (replicated from src/language-service-plugin.ts) ----

interface SymbolDisplayPart {
  kind: string;
  text: string;
}

const MODIFIER_LABELS: Record<string, string> = {
  "?": "optional",
  "*": "zero or more",
  "!": "unchecked",
};

interface JSDocTagInfo {
  name: string;
  text?: SymbolDisplayPart[];
}

interface DefinitionTarget {
  fileName: string;
  textSpan: { start: number; length: number };
}

type DefinitionResolver = (componentName: string) => DefinitionTarget | null;

/**
 * Replicate formatRendersTag from the TS plugin for unit testing.
 * Must stay in sync with src/language-service-plugin.ts.
 */
function formatRendersTag(
  tag: JSDocTagInfo,
  resolveDefinition?: DefinitionResolver,
): JSDocTagInfo | null {
  if (!tag.text || tag.text.length === 0) return null;

  const rawText = tag.text.map((p) => p.text).join("");

  let modifier = "";
  let name = tag.name;
  const nameModifierMatch = name.match(/^renders([?*]?!?)$/);
  if (nameModifierMatch && nameModifierMatch[1]) {
    modifier = nameModifierMatch[1];
  } else {
    const textModifierMatch = rawText.match(/^([?*]!?|!)\s*\{/);
    if (textModifierMatch && textModifierMatch[1]) {
      modifier = textModifierMatch[1];
      name = `renders${modifier}`;
    }
  }

  const contentMatch = rawText.match(/[?*]*!?\s*\{\s*([^}]+)\s*\}/);
  if (!contentMatch) return null;

  const typeContent = contentMatch[1].trim();
  const parts: SymbolDisplayPart[] = [];

  const typeNames = typeContent.split("|");
  typeNames.forEach((typeName, i) => {
    const trimmed = typeName.trim();
    if (!trimmed) return;
    if (i > 0) {
      parts.push({ kind: "text", text: " | " });
    }

    const baseName = trimmed.split(".")[0];
    const target = resolveDefinition?.(baseName);
    if (target) {
      parts.push({ kind: "link", text: "{@linkcode " });
      (parts as any[]).push({ kind: "linkName", text: trimmed, target });
      parts.push({ kind: "link", text: "}" });
    } else {
      parts.push({ kind: "text", text: `\`${trimmed}\`` });
    }
  });

  const label = MODIFIER_LABELS[modifier] ?? MODIFIER_LABELS[modifier[0]];
  if (label) {
    parts.push({ kind: "text", text: ` — *${label}*` });
  }

  return { name, text: parts };
}

/**
 * Replicate formatTransparentTagText from the TS plugin for unit testing.
 * Must stay in sync with src/language-service-plugin.ts.
 */
function formatTransparentTagText(
  text: SymbolDisplayPart[] | undefined,
): SymbolDisplayPart[] | undefined {
  if (!text || text.length === 0) return text;

  const rawText = text.map((p) => p.text).join("");
  const match = rawText.match(/\{\s*([^}]*)\s*\}/);
  if (!match) return text;

  const propContent = match[1].trim();
  if (!propContent) return text;

  const propNames = propContent.split(",").map((n) => n.trim()).filter(Boolean);
  const formatted = propNames.map((n) => `\`${n}\``).join(", ");

  return [{ kind: "text", text: formatted }];
}

/** Helper to extract plain text from display parts */
function partsToText(parts: SymbolDisplayPart[] | undefined): string {
  return parts?.map((p) => p.text).join("") ?? "";
}

describe("formatRendersTag", () => {
  it("formats single component with backticks (no resolver)", () => {
    const result = formatRendersTag({ name: "renders", text: [{ kind: "text", text: "{Header}" }] });
    expect(result).not.toBeNull();
    expect(partsToText(result!.text)).toBe("`Header`");
  });

  it("formats union types with backticks and pipes (no resolver)", () => {
    const result = formatRendersTag({ name: "renders", text: [{ kind: "text", text: "{Header | Footer}" }] });
    expect(partsToText(result!.text)).toBe("`Header` | `Footer`");
  });

  it("formats namespaced component with backticks (no resolver)", () => {
    const result = formatRendersTag({ name: "renders", text: [{ kind: "text", text: "{Menu.Item}" }] });
    expect(partsToText(result!.text)).toBe("`Menu.Item`");
  });

  it("appends italic (optional) for ? modifier and keeps tag name", () => {
    const result = formatRendersTag({ name: "renders?", text: [{ kind: "text", text: "{Header}" }] });
    expect(result!.name).toBe("renders?");
    expect(partsToText(result!.text)).toBe("`Header` — *optional*");
  });

  it("appends italic (zero or more) for * modifier", () => {
    const result = formatRendersTag({ name: "renders*", text: [{ kind: "text", text: "{NavItem}" }] });
    expect(result!.name).toBe("renders*");
    expect(partsToText(result!.text)).toBe("`NavItem` — *zero or more*");
  });

  it("appends italic (unchecked) for ! modifier", () => {
    const result = formatRendersTag({ name: "renders!", text: [{ kind: "text", text: "{Header}" }] });
    expect(result!.name).toBe("renders!");
    expect(partsToText(result!.text)).toBe("`Header` — *unchecked*");
  });

  it("moves modifier from text prefix into tag name", () => {
    const result = formatRendersTag({ name: "renders", text: [{ kind: "text", text: "? {Header}" }] });
    expect(result!.name).toBe("renders?");
    expect(partsToText(result!.text)).toBe("`Header` — *optional*");
  });

  it("returns null when no braces in text", () => {
    expect(formatRendersTag({ name: "renders", text: [{ kind: "text", text: "no braces" }] })).toBeNull();
  });

  it("returns null for undefined text", () => {
    expect(formatRendersTag({ name: "renders", text: undefined })).toBeNull();
  });

  it("returns null for empty text", () => {
    expect(formatRendersTag({ name: "renders", text: [] })).toBeNull();
  });

  describe("with definition resolver (clickable links)", () => {
    const mockTarget: DefinitionTarget = { fileName: "/src/Header.tsx", textSpan: { start: 10, length: 6 } };
    const resolver: DefinitionResolver = (name) => {
      if (name === "Header" || name === "Footer" || name === "Menu" || name === "NavItem") {
        return mockTarget;
      }
      return null;
    };

    it("creates linkcode link parts for resolved component", () => {
      const result = formatRendersTag(
        { name: "renders", text: [{ kind: "text", text: "{Header}" }] },
        resolver,
      );
      expect(result).not.toBeNull();
      expect(result!.text).toContainEqual({ kind: "link", text: "{@linkcode " });
      expect(result!.text).toContainEqual(expect.objectContaining({ kind: "linkName", text: "Header", target: mockTarget }));
      expect(result!.text).toContainEqual({ kind: "link", text: "}" });
    });

    it("creates links for union types", () => {
      const result = formatRendersTag(
        { name: "renders", text: [{ kind: "text", text: "{Header | Footer}" }] },
        resolver,
      );
      expect(result!.text).toContainEqual(expect.objectContaining({ kind: "linkName", text: "Header" }));
      expect(result!.text).toContainEqual({ kind: "text", text: " | " });
      expect(result!.text).toContainEqual(expect.objectContaining({ kind: "linkName", text: "Footer" }));
    });

    it("uses full name for namespaced component link", () => {
      const result = formatRendersTag(
        { name: "renders", text: [{ kind: "text", text: "{Menu.Item}" }] },
        resolver,
      );
      expect(result!.text).toContainEqual(expect.objectContaining({ kind: "linkName", text: "Menu.Item" }));
    });

    it("falls back to backticks for unresolved components", () => {
      const partialResolver: DefinitionResolver = (name) => name === "Header" ? mockTarget : null;
      const result = formatRendersTag(
        { name: "renders", text: [{ kind: "text", text: "{Header | Unknown}" }] },
        partialResolver,
      );
      expect(result!.text).toContainEqual(expect.objectContaining({ kind: "linkName", text: "Header" }));
      expect(result!.text).toContainEqual({ kind: "text", text: "`Unknown`" });
    });

    it("still appends modifier label with links", () => {
      const result = formatRendersTag(
        { name: "renders?", text: [{ kind: "text", text: "{Header}" }] },
        resolver,
      );
      expect(result!.name).toBe("renders?");
      expect(result!.text).toContainEqual(expect.objectContaining({ kind: "linkName", text: "Header" }));
      expect(result!.text).toContainEqual({ kind: "text", text: " — *optional*" });
    });
  });
});

describe("formatTransparentTagText", () => {
  it("formats prop names with backticks", () => {
    const result = formatTransparentTagText([{ kind: "text", text: "{off, children}" }]);
    expect(partsToText(result)).toBe("`off`, `children`");
  });

  it("returns undefined input unchanged", () => {
    expect(formatTransparentTagText(undefined)).toBeUndefined();
  });

  it("returns empty array unchanged", () => {
    const input: SymbolDisplayPart[] = [];
    expect(formatTransparentTagText(input)).toBe(input);
  });

  it("returns input unchanged when no braces", () => {
    const input: SymbolDisplayPart[] = [{ kind: "text", text: "no braces" }];
    expect(formatTransparentTagText(input)).toBe(input);
  });

  it("returns input unchanged for empty braces", () => {
    const input: SymbolDisplayPart[] = [{ kind: "text", text: "{}" }];
    expect(formatTransparentTagText(input)).toBe(input);
  });
});
