import type { ParserServicesWithTypeInformation } from "@typescript-eslint/utils";
import type { SourceCode } from "@typescript-eslint/utils/ts-eslint";
import type { RendersAnnotation } from "../types/index.js";
import { parseRendersAnnotation } from "./jsdoc-parser.js";
import ts from "typescript";

type RenderMap = Map<string, RendersAnnotation>;

export interface CrossFileResolverOptions {
  parserServices: ParserServicesWithTypeInformation;
  sourceCode: SourceCode;
  filename: string;
}

export interface ResolvedComponent {
  name: string;
  filePath: string;
  annotation: RendersAnnotation | null;
}

/**
 * Cache for resolved annotations across files.
 * Key format: "filePath:componentName"
 * This is module-scoped and persists during a lint run.
 */
const annotationCache = new Map<string, RendersAnnotation | null>();

/**
 * Clear the annotation cache.
 * Should be called at the start of a new lint run if needed.
 */
export function clearAnnotationCache(): void {
  annotationCache.clear();
}

/**
 * Create a cross-file resolver for resolving @renders annotations
 * from imported components.
 */
export function createCrossFileResolver(options: CrossFileResolverOptions) {
  const { parserServices, filename } = options;
  const program = parserServices.program;
  const typeChecker = program.getTypeChecker();

  // Get the TypeScript source file for the current file being linted
  const currentSourceFile = program.getSourceFile(filename);

  /**
   * Get JSDoc comment text from a TypeScript node
   */
  function getJSDocText(node: ts.Node): string | null {
    const sourceFile = node.getSourceFile();
    const fullText = sourceFile.getFullText();

    // Get leading comment ranges
    const commentRanges = ts.getLeadingCommentRanges(
      fullText,
      node.getFullStart()
    );

    if (!commentRanges || commentRanges.length === 0) {
      return null;
    }

    // Find JSDoc comments (block comments starting with /*)
    for (const range of commentRanges) {
      if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
        const commentText = fullText.slice(range.pos, range.end);
        if (commentText.startsWith("/*")) {
          return commentText;
        }
      }
    }

    return null;
  }

  /**
   * Get @renders annotation from a TypeScript declaration node
   */
  function getAnnotationFromDeclaration(
    declaration: ts.Declaration
  ): RendersAnnotation | null {
    // Handle variable declarations (const Foo = ...)
    if (ts.isVariableDeclaration(declaration)) {
      // Check the parent variable statement
      const varDeclList = declaration.parent;
      if (ts.isVariableDeclarationList(varDeclList)) {
        const varStatement = varDeclList.parent;
        if (ts.isVariableStatement(varStatement)) {
          const jsDoc = getJSDocText(varStatement);
          if (jsDoc) {
            return parseRendersAnnotation(jsDoc);
          }
        }
      }
    }

    // Handle function declarations
    if (ts.isFunctionDeclaration(declaration)) {
      const jsDoc = getJSDocText(declaration);
      if (jsDoc) {
        return parseRendersAnnotation(jsDoc);
      }
    }

    // Handle export assignment (export default ...)
    if (ts.isExportAssignment(declaration)) {
      const jsDoc = getJSDocText(declaration);
      if (jsDoc) {
        return parseRendersAnnotation(jsDoc);
      }
    }

    return null;
  }

  /**
   * Resolve a symbol to its original declaration, following aliases
   */
  function resolveSymbolToDeclaration(
    symbol: ts.Symbol
  ): ts.Declaration | null {
    // Follow alias symbols to their original declaration
    let resolvedSymbol = symbol;

    while (resolvedSymbol.flags & ts.SymbolFlags.Alias) {
      const aliasedSymbol = typeChecker.getAliasedSymbol(resolvedSymbol);
      if (aliasedSymbol === resolvedSymbol) {
        break;
      }
      resolvedSymbol = aliasedSymbol;
    }

    const declarations = resolvedSymbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      return null;
    }

    return declarations[0];
  }

  /**
   * Get @renders annotation for an imported component by name
   */
  function getExternalRenderAnnotation(
    componentName: string,
    importDeclaration: ts.ImportDeclaration
  ): RendersAnnotation | null {
    const moduleSpecifier = importDeclaration.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) {
      return null;
    }

    // Resolve the module to its source file
    const currentSourceFile = importDeclaration.getSourceFile();
    const resolvedModule = ts.resolveModuleName(
      moduleSpecifier.text,
      currentSourceFile.fileName,
      program.getCompilerOptions(),
      ts.sys
    );

    if (
      !resolvedModule.resolvedModule ||
      !resolvedModule.resolvedModule.resolvedFileName
    ) {
      return null;
    }

    const targetFilePath = resolvedModule.resolvedModule.resolvedFileName;

    // Check cache first
    const cacheKey = `${targetFilePath}:${componentName}`;
    if (annotationCache.has(cacheKey)) {
      return annotationCache.get(cacheKey) ?? null;
    }

    // Get the source file
    const targetSourceFile = program.getSourceFile(targetFilePath);
    if (!targetSourceFile) {
      annotationCache.set(cacheKey, null);
      return null;
    }

    // Find the export symbol for this component
    const symbol = typeChecker.getSymbolAtLocation(moduleSpecifier);
    if (!symbol) {
      annotationCache.set(cacheKey, null);
      return null;
    }

    const exports = typeChecker.getExportsOfModule(symbol);
    const exportSymbol = exports.find((exp) => exp.getName() === componentName);

    if (!exportSymbol) {
      annotationCache.set(cacheKey, null);
      return null;
    }

    // Resolve to original declaration
    const declaration = resolveSymbolToDeclaration(exportSymbol);
    if (!declaration) {
      annotationCache.set(cacheKey, null);
      return null;
    }

    const annotation = getAnnotationFromDeclaration(declaration);
    annotationCache.set(cacheKey, annotation);
    return annotation;
  }

  /**
   * Collect import mappings from the current file.
   * Returns a map of local names to their import info.
   */
  function collectImports(
    sourceFile: ts.SourceFile
  ): Map<string, { importDeclaration: ts.ImportDeclaration; originalName: string }> {
    const imports = new Map<
      string,
      { importDeclaration: ts.ImportDeclaration; originalName: string }
    >();

    ts.forEachChild(sourceFile, (node) => {
      if (!ts.isImportDeclaration(node)) {
        return;
      }

      const importClause = node.importClause;
      if (!importClause) {
        return;
      }

      // Default import: import Foo from '...'
      if (importClause.name) {
        imports.set(importClause.name.text, {
          importDeclaration: node,
          originalName: "default",
        });
      }

      // Named imports: import { Foo, Bar as Baz } from '...'
      const namedBindings = importClause.namedBindings;
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          const localName = element.name.text;
          const originalName = element.propertyName
            ? element.propertyName.text
            : element.name.text;

          imports.set(localName, {
            importDeclaration: node,
            originalName,
          });
        }
      }

      // Namespace import: import * as Foo from '...'
      if (namedBindings && ts.isNamespaceImport(namedBindings)) {
        // For namespace imports, we'd need special handling for Foo.Component
        // This is handled separately in augmentRenderMapWithImports
      }
    });

    return imports;
  }

  /**
   * Build an augmented render map that includes annotations from imported components.
   * This merges local annotations with external ones.
   */
  function buildAugmentedRenderMap(localRenderMap: RenderMap): RenderMap {
    const augmentedMap = new Map(localRenderMap);

    if (!currentSourceFile) {
      return augmentedMap;
    }

    const imports = collectImports(currentSourceFile);

    // For each imported component, try to get its @renders annotation
    for (const [localName, importInfo] of imports) {
      // Skip if we already have a local definition
      if (augmentedMap.has(localName)) {
        continue;
      }

      const annotation = getExternalRenderAnnotation(
        importInfo.originalName,
        importInfo.importDeclaration
      );

      if (annotation) {
        augmentedMap.set(localName, annotation);
      }
    }

    return augmentedMap;
  }

  /**
   * Get @renders annotation for a component by name.
   * First checks local definitions, then imports.
   */
  function getAnnotationForComponent(
    componentName: string,
    localRenderMap: RenderMap
  ): RendersAnnotation | null {
    // Check local map first
    if (localRenderMap.has(componentName)) {
      return localRenderMap.get(componentName)!;
    }

    if (!currentSourceFile) {
      return null;
    }

    // Check imports
    const imports = collectImports(currentSourceFile);
    const importInfo = imports.get(componentName);

    if (importInfo) {
      return getExternalRenderAnnotation(
        importInfo.originalName,
        importInfo.importDeclaration
      );
    }

    return null;
  }

  return {
    getExternalRenderAnnotation,
    buildAugmentedRenderMap,
    getAnnotationForComponent,
    collectImports,
  };
}

/**
 * Try to get parser services, returning null if typed linting is not enabled.
 */
export function tryGetTypedParserServices(
  context: Parameters<typeof createCrossFileResolver>[0]["parserServices"] extends infer T
    ? { parserServices?: T }
    : never
): ParserServicesWithTypeInformation | null {
  try {
    const services = context.parserServices;
    if (
      services &&
      "program" in services &&
      services.program &&
      "esTreeNodeToTSNodeMap" in services
    ) {
      return services as ParserServicesWithTypeInformation;
    }
  } catch {
    // Parser services not available
  }
  return null;
}
