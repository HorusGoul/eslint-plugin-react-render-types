/**
 * TypeScript Language Service Plugin that prevents IDEs from greying out
 * or auto-removing imports referenced in @renders JSDoc annotations.
 *
 * Without this plugin, TypeScript's language service treats these imports as
 * unused (since they only appear in JSDoc comments, not in runtime code),
 * causing them to be dimmed and potentially removed by "organize imports".
 *
 * This is an IDE-only feature — it does not affect `tsc` CLI output.
 *
 * Enable in tsconfig.json:
 * {
 *   "compilerOptions": {
 *     "plugins": [
 *       { "name": "eslint-plugin-react-render-types/lsp" }
 *     ]
 *   }
 * }
 */

import type ts from "typescript/lib/tsserverlibrary";

interface RendersComponentSpan {
  name: string; // base name before first "." (import lookup key)
  fullName: string; // as written, e.g. "Menu.Item"
  start: number; // absolute position in source text
  length: number; // length of fullName
}

/** Diagnostic codes for "declared but never read / never used" */
const UNUSED_DIAGNOSTIC_CODES = new Set([
  6133, // '{0}' is declared but its value is never read.
  6196, // '{0}' is declared but never used.
]);

/**
 * Extract component names referenced in @renders annotations from source text.
 * Handles union types (Header | Footer), namespaced (Menu.Item → Menu),
 * and all modifiers (@renders?, @renders*, @renders!).
 */
function getRendersComponentNames(sourceText: string): Set<string> {
  const regex = /(?:^|[^a-zA-Z@])@renders(?:\?|\*)?(?:!)?\s*\{\s*([^}]+)\s*\}/g;
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceText)) !== null) {
    const typeExpr = match[1];
    for (const part of typeExpr.split("|")) {
      const name = part.trim().split(".")[0]; // Menu.Item → Menu
      if (name && /^[A-Z]/.test(name)) {
        names.add(name);
      }
    }
  }
  return names;
}

/**
 * Like getRendersComponentNames, but tracks the absolute position of each
 * component name in the source text so we can map cursor positions back.
 */
function getRendersComponentSpans(sourceText: string): RendersComponentSpan[] {
  const regex = /(?:^|[^a-zA-Z@])@renders(?:\?|\*)?(?:!)?\s*\{\s*([^}]+)\s*\}/g;
  const spans: RendersComponentSpan[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sourceText)) !== null) {
    const typeExpr = match[1];
    // match[1] starts at this absolute offset in the source
    const typeExprStart = match.index + match[0].indexOf(typeExpr);

    let offset = 0;
    for (const part of typeExpr.split("|")) {
      // offset within typeExpr where this part starts (including the "|")
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
 * Find the position of an import identifier matching targetName in the source file.
 * Checks named imports, default imports, and namespace imports.
 */
function findImportIdentifierPosition(
  sourceFile: ts.SourceFile,
  targetName: string,
  tsModule: typeof ts,
): number | null {
  for (const stmt of sourceFile.statements) {
    if (!tsModule.isImportDeclaration(stmt)) continue;
    const clause = stmt.importClause;
    if (!clause) continue;

    // Default import: import Menu from "..."
    if (clause.name && clause.name.text === targetName) {
      return clause.name.getStart(sourceFile);
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;

    // Namespace import: import * as UI from "..."
    if (tsModule.isNamespaceImport(bindings)) {
      if (bindings.name.text === targetName) {
        return bindings.name.getStart(sourceFile);
      }
    }

    // Named imports: import { Header, Footer as F } from "..."
    if (tsModule.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.name.text === targetName) {
          return element.name.getStart(sourceFile);
        }
      }
    }
  }
  return null;
}

/**
 * Find the position of a local declaration (function or variable) matching targetName.
 * Fallback for components defined in the same file as the @renders annotation.
 */
function findLocalDeclarationPosition(
  sourceFile: ts.SourceFile,
  targetName: string,
  tsModule: typeof ts,
): number | null {
  for (const stmt of sourceFile.statements) {
    // function Header() { ... }
    if (tsModule.isFunctionDeclaration(stmt) && stmt.name?.text === targetName) {
      return stmt.name.getStart(sourceFile);
    }

    // const Header = ...
    if (tsModule.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (tsModule.isIdentifier(decl.name) && decl.name.text === targetName) {
          return decl.name.getStart(sourceFile);
        }
      }
    }
  }
  return null;
}

function init(modules: { typescript: typeof ts }) {
  const tsModule = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {

    const proxy = Object.create(null) as ts.LanguageService;

    // Delegate all methods to the original language service
    for (const k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
      const x = info.languageService[k]!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      (proxy as any)[k] = (...args: any[]) => (x as any).apply(info.languageService, args);
    }

    function isRendersReferencedImport(
      d: ts.Diagnostic,
      sourceFile: ts.SourceFile,
      rendersNames: Set<string>,
    ): boolean {
      if (!UNUSED_DIAGNOSTIC_CODES.has(d.code)) return false;

      // When an import has a single specifier and it's unused, TypeScript's
      // diagnostic spans the entire import declaration, not just the identifier.
      // Extract the identifier from the message text ("'{name}' is declared...")
      // which is reliable regardless of span width.
      const msg = typeof d.messageText === "string" ? d.messageText : d.messageText.messageText;
      const match = msg.match(/^'([^']+)'/);
      if (match) {
        return rendersNames.has(match[1]);
      }

      // Fallback: try the span text directly (covers cases where span = identifier)
      if (d.start == null || d.length == null) return false;
      const name = sourceFile.text.substring(d.start, d.start + d.length);
      return rendersNames.has(name);
    }

    // Suggestion diagnostics: the greyed-out hints IDEs show for unused imports.
    // These appear regardless of noUnusedLocals and drive "organize imports on save".
    // We filter them out entirely for @renders-referenced imports.
    proxy.getSuggestionDiagnostics = (fileName: string) => {
      const prior = info.languageService.getSuggestionDiagnostics(fileName);

      const program = info.languageService.getProgram();
      const sourceFile = program?.getSourceFile(fileName);
      if (!sourceFile) return prior;

      const rendersNames = getRendersComponentNames(sourceFile.text);
      if (rendersNames.size === 0) return prior;

      return prior.filter((d) => !isRendersReferencedImport(d, sourceFile, rendersNames));
    };

    // Semantic diagnostics: hard errors from noUnusedLocals / noUnusedParameters.
    // We don't suppress these — if the user enabled noUnusedLocals, they should
    // see the error. Instead, we replace the message with advice to disable it.
    proxy.getSemanticDiagnostics = (fileName: string) => {
      const prior = info.languageService.getSemanticDiagnostics(fileName);

      const program = info.languageService.getProgram();
      const sourceFile = program?.getSourceFile(fileName);
      if (!sourceFile) return prior;

      const rendersNames = getRendersComponentNames(sourceFile.text);
      if (rendersNames.size === 0) return prior;

      return prior.map((d) => {
        if (!isRendersReferencedImport(d, sourceFile, rendersNames)) return d;

        const msg = typeof d.messageText === "string" ? d.messageText : d.messageText.messageText;
        const nameMatch = msg.match(/^'([^']+)'/);
        const name = nameMatch ? nameMatch[1] : sourceFile.text.substring(d.start!, d.start! + d.length!);
        return {
          ...d,
          messageText:
            `'${name}' is referenced in a @renders annotation but noUnusedLocals treats it as unused. ` +
            `Disable noUnusedLocals in tsconfig.json and use the ESLint no-unused-vars rule instead.`,
          category: tsModule.DiagnosticCategory.Error,
        };
      });
    };

    // Resolve a cursor position to a @renders component span and the
    // corresponding import/local declaration position.
    function resolveRendersTarget(fileName: string, position: number) {
      const program = info.languageService.getProgram();
      const sourceFile = program?.getSourceFile(fileName);
      if (!sourceFile) return null;

      const spans = getRendersComponentSpans(sourceFile.text);
      const hit = spans.find(
        (s) => position >= s.start && position < s.start + s.length,
      );
      if (!hit) return null;

      const importPos = findImportIdentifierPosition(sourceFile, hit.name, tsModule);
      const targetPos = importPos ?? findLocalDeclarationPosition(sourceFile, hit.name, tsModule);
      if (targetPos == null) return null;

      return { hit, targetPos };
    }

    // Go-to-definition: cmd+click on component names inside @renders annotations
    // navigates to the component's import or local declaration.
    proxy.getDefinitionAndBoundSpan = (fileName: string, position: number) => {
      const resolved = resolveRendersTarget(fileName, position);
      if (resolved) {
        const result = info.languageService.getDefinitionAndBoundSpan(fileName, resolved.targetPos);
        if (result) {
          return {
            ...result,
            textSpan: { start: resolved.hit.start, length: resolved.hit.length },
          };
        }
      }
      return info.languageService.getDefinitionAndBoundSpan(fileName, position);
    };

    // Hover info: hovering component names inside @renders annotations shows
    // the same type information as hovering the import identifier.
    proxy.getQuickInfoAtPosition = (fileName: string, position: number) => {
      const resolved = resolveRendersTarget(fileName, position);
      if (resolved) {
        const result = info.languageService.getQuickInfoAtPosition(fileName, resolved.targetPos);
        if (result) {
          return {
            ...result,
            textSpan: { start: resolved.hit.start, length: resolved.hit.length },
          };
        }
      }
      return info.languageService.getQuickInfoAtPosition(fileName, position);
    };

    return proxy;
  }

  return { create };
}

export = init;
