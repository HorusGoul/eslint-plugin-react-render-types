import type { ParserServicesWithTypeInformation } from "@typescript-eslint/utils";
import type { SourceCode } from "@typescript-eslint/utils/ts-eslint";
import type {
  RendersAnnotation,
  ResolvedRendersAnnotation,
  ResolvedRenderMap,
  ComponentTypeId,
  TransparentAnnotation,
} from "../types/index.js";
import { parseRendersAnnotation, parseTransparentAnnotation } from "./jsdoc-parser.js";
import ts from "typescript";

type RenderMap = Map<string, RendersAnnotation>;

export interface CrossFileResolverOptions {
  parserServices: ParserServicesWithTypeInformation;
  sourceCode: SourceCode;
  filename: string;
}

/**
 * Cache for resolved annotations across files.
 * Key format: "filePath:componentName"
 * This is module-scoped and persists during a lint run.
 */
const annotationCache = new Map<string, RendersAnnotation | null>();
const transparentAnnotationCache = new Map<string, TransparentAnnotation | null>();

/**
 * Clear the annotation cache.
 * Should be called at the start of a new lint run if needed.
 */
export function clearAnnotationCache(): void {
  annotationCache.clear();
  transparentAnnotationCache.clear();
}

/**
 * Create a cross-file resolver for resolving @renders annotations
 * from imported components using TypeScript's type system.
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
    const importSourceFile = importDeclaration.getSourceFile();
    const resolvedModule = ts.resolveModuleName(
      moduleSpecifier.text,
      importSourceFile.fileName,
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
    });

    return imports;
  }

  /**
   * Create a unique type ID from a symbol's declaration
   * Format: "filePath:symbolName"
   */
  function createTypeId(symbol: ts.Symbol): ComponentTypeId | null {
    // Follow aliases to get the original symbol
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

    const declaration = declarations[0];
    const sourceFile = declaration.getSourceFile();
    const symbolName = resolvedSymbol.getName();

    return `${sourceFile.fileName}:${symbolName}`;
  }

  /**
   * Get the type ID for a component by its local name.
   * Resolves through imports to get the actual source file and symbol.
   */
  function getComponentTypeId(componentName: string): ComponentTypeId | null {
    if (!currentSourceFile) {
      return null;
    }

    // Handle namespaced components (e.g., Menu.Item)
    const parts = componentName.split(".");
    const baseName = parts[0];

    // Find the symbol for this name in the current scope
    const symbol = typeChecker.resolveName(
      baseName,
      currentSourceFile,
      ts.SymbolFlags.Value | ts.SymbolFlags.Alias,
      /* excludeGlobals */ false
    );

    if (!symbol) {
      return null;
    }

    // For namespaced components, we need to resolve the property
    if (parts.length > 1) {
      // Get the type of the base component
      const type = typeChecker.getTypeOfSymbol(symbol);
      let currentType = type;

      for (let i = 1; i < parts.length; i++) {
        const prop = currentType.getProperty(parts[i]);
        if (!prop) {
          return null;
        }
        if (i === parts.length - 1) {
          return createTypeId(prop);
        }
        currentType = typeChecker.getTypeOfSymbol(prop);
      }
    }

    return createTypeId(symbol);
  }

  /**
   * Get the type ID for a component by name resolved from a specific scope.
   * Used to resolve annotation targets from the file where the annotation is defined.
   */
  function getComponentTypeIdInScope(
    componentName: string,
    scopeNode: ts.Node
  ): ComponentTypeId | null {
    const parts = componentName.split(".");
    const baseName = parts[0];

    const symbol = typeChecker.resolveName(
      baseName,
      scopeNode,
      ts.SymbolFlags.Value | ts.SymbolFlags.Alias,
      /* excludeGlobals */ false
    );

    if (!symbol) {
      return null;
    }

    if (parts.length > 1) {
      const type = typeChecker.getTypeOfSymbol(symbol);
      let currentType = type;

      for (let i = 1; i < parts.length; i++) {
        const prop = currentType.getProperty(parts[i]);
        if (!prop) {
          return null;
        }
        if (i === parts.length - 1) {
          return createTypeId(prop);
        }
        currentType = typeChecker.getTypeOfSymbol(prop);
      }
    }

    return createTypeId(symbol);
  }

  /**
   * Resolve the source file that an import declaration points to.
   */
  function resolveImportSourceFile(
    importDeclaration: ts.ImportDeclaration
  ): ts.SourceFile | null {
    const moduleSpecifier = importDeclaration.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) {
      return null;
    }

    const importSourceFile = importDeclaration.getSourceFile();
    const resolvedModule = ts.resolveModuleName(
      moduleSpecifier.text,
      importSourceFile.fileName,
      program.getCompilerOptions(),
      ts.sys
    );

    if (
      !resolvedModule.resolvedModule ||
      !resolvedModule.resolvedModule.resolvedFileName
    ) {
      return null;
    }

    return program.getSourceFile(
      resolvedModule.resolvedModule.resolvedFileName
    ) ?? null;
  }

  /**
   * Resolve the type ID for the primary component in a @renders annotation.
   * This looks up the component name in the current file's scope.
   */
  function resolveAnnotationTargetTypeId(
    annotation: RendersAnnotation
  ): ComponentTypeId | null {
    return getComponentTypeId(annotation.componentName);
  }

  /**
   * Resolve type IDs for all components in a @renders union annotation.
   * Returns an array of type IDs (some may be undefined if resolution fails).
   */
  function resolveAnnotationTargetTypeIds(
    annotation: RendersAnnotation
  ): (ComponentTypeId | undefined)[] {
    return annotation.componentNames.map(
      (name) => getComponentTypeId(name) ?? undefined
    );
  }

  /**
   * Resolve a type alias to its constituent component names.
   * For example, `type AliasedUnion = A | B` returns ["A", "B"].
   * Returns null if the type is not a valid component union.
   */
  function resolveTypeAliasToComponentNames(
    typeName: string
  ): string[] | null {
    if (!currentSourceFile) {
      return null;
    }

    // Find the symbol for this type name (type alias)
    const symbol = typeChecker.resolveName(
      typeName,
      currentSourceFile,
      ts.SymbolFlags.TypeAlias,
      /* excludeGlobals */ false
    );

    if (!symbol) {
      return null;
    }

    // Get the declarations to find the type alias declaration
    const declarations = symbol.getDeclarations();
    if (!declarations || declarations.length === 0) {
      return null;
    }

    const declaration = declarations[0];
    if (!ts.isTypeAliasDeclaration(declaration)) {
      return null;
    }

    // Check if the type is a union type node
    const typeNode = declaration.type;
    if (!ts.isUnionTypeNode(typeNode)) {
      return null;
    }

    const componentNames: string[] = [];

    for (const memberTypeNode of typeNode.types) {
      // Get the type reference name
      if (ts.isTypeReferenceNode(memberTypeNode)) {
        const memberTypeName = memberTypeNode.typeName;
        if (ts.isIdentifier(memberTypeName)) {
          const name = memberTypeName.text;

          // Validate it's a valid component name (starts with uppercase)
          if (!/^[A-Z]/.test(name)) {
            return null;
          }

          componentNames.push(name);
        } else if (ts.isQualifiedName(memberTypeName)) {
          // Handle qualified names like Namespace.Component
          const parts: string[] = [];
          let current: ts.EntityName = memberTypeName;
          while (ts.isQualifiedName(current)) {
            parts.unshift(current.right.text);
            current = current.left;
          }
          if (ts.isIdentifier(current)) {
            parts.unshift(current.text);
          }
          const name = parts.join(".");

          // Validate first part starts with uppercase
          if (!/^[A-Z]/.test(parts[0])) {
            return null;
          }

          componentNames.push(name);
        }
      } else {
        // Not a type reference, can't handle
        return null;
      }
    }

    if (componentNames.length === 0) {
      return null;
    }

    return componentNames;
  }

  /**
   * Expand a @renders annotation to resolve any type aliases.
   * If the annotation references a type alias that is a union,
   * it expands componentNames to include all union members.
   */
  function expandTypeAliases(
    annotation: RendersAnnotation
  ): RendersAnnotation {
    // If already a union (contains multiple components), return as-is
    if (annotation.componentNames.length > 1) {
      return annotation;
    }

    // Try to resolve the single component name as a type alias
    const expandedNames = resolveTypeAliasToComponentNames(
      annotation.componentName
    );

    if (expandedNames && expandedNames.length > 1) {
      // It's a type alias union - expand it
      return {
        ...annotation,
        componentName: expandedNames[0],
        componentNames: expandedNames,
      };
    }

    // Not a type alias union, return as-is
    return annotation;
  }

  /**
   * Build a resolved render map with type IDs for type-safe validation.
   * Each annotation includes the targetTypeId if it can be resolved.
   */
  function buildResolvedRenderMap(
    localRenderMap: RenderMap
  ): ResolvedRenderMap {
    const resolvedMap: ResolvedRenderMap = new Map();

    if (!currentSourceFile) {
      // Without source file, just copy the annotations without type IDs
      for (const [name, annotation] of localRenderMap) {
        resolvedMap.set(name, { ...annotation });
      }
      return resolvedMap;
    }

    // Process local components
    for (const [name, annotation] of localRenderMap) {
      // Expand type aliases (e.g., type AliasedUnion = A | B)
      const expandedAnnotation = expandTypeAliases(annotation);
      const targetTypeId = resolveAnnotationTargetTypeId(expandedAnnotation);
      const targetTypeIds = resolveAnnotationTargetTypeIds(expandedAnnotation).filter(
        (id): id is ComponentTypeId => id !== undefined
      );
      resolvedMap.set(name, {
        ...expandedAnnotation,
        targetTypeId: targetTypeId ?? undefined,
        targetTypeIds: targetTypeIds.length > 0 ? targetTypeIds : undefined,
      });
    }

    // Process imported components
    const imports = collectImports(currentSourceFile);
    for (const [localName, importInfo] of imports) {
      if (resolvedMap.has(localName)) {
        continue;
      }

      const annotation = getExternalRenderAnnotation(
        importInfo.originalName,
        importInfo.importDeclaration
      );

      if (annotation) {
        // Expand type aliases (e.g., type AliasedUnion = A | B)
        const expandedAnnotation = expandTypeAliases(annotation);

        // Resolve target type IDs from the SOURCE file where the annotation lives,
        // not from the consumer file (the target may not be imported in the consumer).
        // We resolve the symbol to its actual declaration file rather than using
        // resolveImportSourceFile, because barrel/re-export files don't have the
        // annotation targets as local names in scope.
        let scopeNode: ts.Node = currentSourceFile;
        const importedSymbol = typeChecker.resolveName(
          localName,
          currentSourceFile,
          ts.SymbolFlags.Value | ts.SymbolFlags.Alias,
          /* excludeGlobals */ false
        );
        if (importedSymbol) {
          const decl = resolveSymbolToDeclaration(importedSymbol);
          if (decl) {
            scopeNode = decl.getSourceFile();
          }
        }

        const targetTypeId = getComponentTypeIdInScope(
          expandedAnnotation.componentName,
          scopeNode
        ) ?? undefined;
        const targetTypeIds = expandedAnnotation.componentNames
          .map((name) => getComponentTypeIdInScope(name, scopeNode))
          .filter((id): id is ComponentTypeId => id !== null);

        resolvedMap.set(localName, {
          ...expandedAnnotation,
          targetTypeId,
          targetTypeIds: targetTypeIds.length > 0 ? targetTypeIds : undefined,
        });
      }
    }

    return resolvedMap;
  }

  /**
   * Resolve @renders annotations from an imported component's props type.
   * Uses TypeScript's type checker to find the props interface and parse
   * JSDoc annotations from its property declarations.
   * Target type IDs are resolved from the source file's scope where the
   * annotation is defined, so consumers don't need to import target types.
   */
  function getExternalPropAnnotations(
    componentName: string
  ): Map<string, ResolvedRendersAnnotation> | null {
    if (!currentSourceFile) return null;

    const symbol = typeChecker.resolveName(
      componentName,
      currentSourceFile,
      ts.SymbolFlags.Value | ts.SymbolFlags.Alias,
      /* excludeGlobals */ false
    );
    if (!symbol) return null;

    const type = typeChecker.getTypeOfSymbol(symbol);
    const callSignatures = type.getCallSignatures();
    if (callSignatures.length === 0) return null;

    const propsParam = callSignatures[0].getParameters()[0];
    if (!propsParam) return null;

    const propsType = typeChecker.getTypeOfSymbol(propsParam);
    const result = new Map<string, ResolvedRendersAnnotation>();

    for (const prop of propsType.getProperties()) {
      const declarations = prop.getDeclarations();
      if (!declarations || declarations.length === 0) continue;

      for (const decl of declarations) {
        const jsDocText = getJSDocText(decl);
        if (!jsDocText) continue;

        const annotation = parseRendersAnnotation(jsDocText);
        if (annotation) {
          // Resolve target type IDs from the source file where the annotation lives
          const sourceFile = decl.getSourceFile();
          const targetTypeId = getComponentTypeIdInScope(
            annotation.componentName,
            sourceFile
          ) ?? undefined;
          const targetTypeIds = annotation.componentNames
            .map((name) => getComponentTypeIdInScope(name, sourceFile))
            .filter((id): id is ComponentTypeId => id !== null);

          result.set(prop.getName(), {
            ...annotation,
            targetTypeId,
            targetTypeIds: targetTypeIds.length > 0 ? targetTypeIds : undefined,
          });
          break;
        }
      }
    }

    return result.size > 0 ? result : null;
  }

  /**
   * Get @transparent annotation from a TypeScript declaration node
   */
  function getTransparentAnnotationFromDeclaration(
    declaration: ts.Declaration
  ): TransparentAnnotation | null {
    // Handle variable declarations (const Foo = ...)
    if (ts.isVariableDeclaration(declaration)) {
      const varDeclList = declaration.parent;
      if (ts.isVariableDeclarationList(varDeclList)) {
        const varStatement = varDeclList.parent;
        if (ts.isVariableStatement(varStatement)) {
          const jsDoc = getJSDocText(varStatement);
          if (jsDoc) {
            return parseTransparentAnnotation(jsDoc);
          }
        }
      }
    }

    // Handle function declarations
    if (ts.isFunctionDeclaration(declaration)) {
      const jsDoc = getJSDocText(declaration);
      if (jsDoc) {
        return parseTransparentAnnotation(jsDoc);
      }
    }

    // Handle export assignment (export default ...)
    if (ts.isExportAssignment(declaration)) {
      const jsDoc = getJSDocText(declaration);
      if (jsDoc) {
        return parseTransparentAnnotation(jsDoc);
      }
    }

    return null;
  }

  /**
   * Get @transparent annotation for an imported component by name.
   * Returns the TransparentAnnotation if the imported component has @transparent.
   */
  function getExternalTransparentAnnotation(
    componentName: string,
    importDeclaration: ts.ImportDeclaration
  ): TransparentAnnotation | null {
    const moduleSpecifier = importDeclaration.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) {
      return null;
    }

    // Resolve the module to its source file
    const importSourceFile = importDeclaration.getSourceFile();
    const resolvedModule = ts.resolveModuleName(
      moduleSpecifier.text,
      importSourceFile.fileName,
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
    if (transparentAnnotationCache.has(cacheKey)) {
      return transparentAnnotationCache.get(cacheKey) ?? null;
    }

    // Get the source file
    const targetSourceFile = program.getSourceFile(targetFilePath);
    if (!targetSourceFile) {
      transparentAnnotationCache.set(cacheKey, null);
      return null;
    }

    // Find the export symbol for this component
    const symbol = typeChecker.getSymbolAtLocation(moduleSpecifier);
    if (!symbol) {
      transparentAnnotationCache.set(cacheKey, null);
      return null;
    }

    const exports = typeChecker.getExportsOfModule(symbol);
    const exportSymbol = exports.find((exp) => exp.getName() === componentName);

    if (!exportSymbol) {
      transparentAnnotationCache.set(cacheKey, null);
      return null;
    }

    // Resolve to original declaration
    const declaration = resolveSymbolToDeclaration(exportSymbol);
    if (!declaration) {
      transparentAnnotationCache.set(cacheKey, null);
      return null;
    }

    const annotation = getTransparentAnnotationFromDeclaration(declaration);
    transparentAnnotationCache.set(cacheKey, annotation);
    return annotation;
  }

  /**
   * Resolve transparent components from both local annotations and imports.
   * Local entries are passed in (collected during first AST pass).
   * Imported @transparent components are discovered via TypeScript's type checker.
   * Returns a Map<string, Set<string>> keyed by local name for extraction functions.
   */
  function resolveTransparentComponents(
    localTransparentComponents: Map<string, Set<string>>
  ): Map<string, Set<string>> {
    const resolvedMap = new Map<string, Set<string>>();

    // Include local entries
    for (const [name, props] of localTransparentComponents) {
      resolvedMap.set(name, props);
    }

    // Discover imported @transparent components
    if (currentSourceFile) {
      const imports = collectImports(currentSourceFile);
      for (const [localName, importInfo] of imports) {
        // Skip if already registered locally
        if (resolvedMap.has(localName)) continue;

        const annotation = getExternalTransparentAnnotation(
          importInfo.originalName,
          importInfo.importDeclaration
        );

        if (annotation) {
          resolvedMap.set(localName, new Set(annotation.propNames));
        }
      }
    }

    return resolvedMap;
  }

  return {
    getComponentTypeId,
    buildResolvedRenderMap,
    expandTypeAliases,
    resolveTypeAliasToComponentNames,
    getExternalPropAnnotations,
    resolveTransparentComponents,
  };
}
