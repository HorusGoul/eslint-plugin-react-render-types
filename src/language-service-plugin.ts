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
 *       { "name": "eslint-plugin-react-render-types/language-service-plugin" }
 *     ]
 *   }
 * }
 */

import type ts from "typescript/lib/tsserverlibrary";

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

        const name = sourceFile.text.substring(d.start!, d.start! + d.length!);
        return {
          ...d,
          messageText:
            `'${name}' is referenced in a @renders annotation but noUnusedLocals treats it as unused. ` +
            `Disable noUnusedLocals in tsconfig.json and use the ESLint no-unused-vars rule instead.`,
          category: tsModule.DiagnosticCategory.Error,
        };
      });
    };

    return proxy;
  }

  return { create };
}

export = init;
