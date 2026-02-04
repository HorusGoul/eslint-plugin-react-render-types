import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation, parseTransparentAnnotation } from "../utils/jsdoc-parser.js";
import { getJSXElementName, isComponentName, getWrappingVariableDeclarator } from "../utils/component-utils.js";
import { extractChildElementNames, extractJSXFromExpression } from "../utils/jsx-extraction.js";
import { canRenderComponentTyped } from "../utils/render-chain.js";
import { createCrossFileResolver } from "../utils/cross-file-resolver.js";
import type { RendersAnnotation, TransparentAnnotation, ResolvedRenderMap } from "../types/index.js";
import { getPluginSettings } from "../utils/settings.js";

type MessageIds = "invalidRenderReturn";

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export default createRule<[], MessageIds>({
  name: "valid-render-return",
  meta: {
    type: "problem",
    docs: {
      description:
        "Verify component returns match @renders JSDoc annotation",
    },
    messages: {
      invalidRenderReturn:
        "Component annotated with @renders `{{expected}}` but returns `{{actual}}`",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    // Build a map of component names to their @renders annotations
    // This enables chained rendering validation
    const localRenderMap: Map<string, RendersAnnotation> = new Map();

    // Store functions to validate after we've built the render map
    const functionsToValidate: Array<{
      node: FunctionNode;
      annotation: RendersAnnotation;
      componentName: string;
    }> = [];

    // Local @transparent annotations collected during first AST pass
    const localTransparentComponents = new Map<string, Set<string>>();

    // Settings-based transparent components (remain name-based)
    const { transparentComponentsMap: settingsTransparentComponents, additionalComponentWrappers } = getPluginSettings(context.settings);

    // Merged transparency map: built at Program:exit from settings + local + cross-file
    let transparentComponents = new Map<string, Set<string>>();

    // Get typed parser services (required for this rule)
    const parserServices = ESLintUtils.getParserServices(context);
    const crossFileResolver = createCrossFileResolver({
      parserServices,
      sourceCode,
      filename: context.filename,
    });

    /**
     * Get component name from a function node
     */
    function getComponentName(node: FunctionNode): string | null {
      if (node.type === "FunctionDeclaration" && node.id) {
        return node.id.name;
      }

      // For arrow functions and function expressions in variable declarations
      if (
        node.parent?.type === "VariableDeclarator" &&
        node.parent.id.type === "Identifier"
      ) {
        return node.parent.id.name;
      }

      // For functions inside React wrappers: forwardRef((props, ref) => ...), memo(() => ...)
      const wrapper = getWrappingVariableDeclarator(node, additionalComponentWrappers);
      if (wrapper) {
        return wrapper.id.type === "Identifier" ? wrapper.id.name : null;
      }

      return null;
    }

    /**
     * Get the @renders annotation from a function node's leading comments
     */
    function getRendersAnnotation(node: FunctionNode): RendersAnnotation | null {
      // For variable declarations (const MyComp = () => ...), check parent
      let varDeclarator: TSESTree.VariableDeclarator | null =
        node.parent?.type === "VariableDeclarator" ? node.parent : null;

      // For functions inside React wrappers: forwardRef, memo
      if (!varDeclarator) {
        varDeclarator = getWrappingVariableDeclarator(node, additionalComponentWrappers);
      }

      let nodeToCheck: TSESTree.Node =
        varDeclarator?.parent?.type === "VariableDeclaration"
          ? varDeclarator.parent
          : node;

      // For exported declarations, the JSDoc sits before `export`
      if (
        nodeToCheck.parent?.type === "ExportNamedDeclaration" ||
        nodeToCheck.parent?.type === "ExportDefaultDeclaration"
      ) {
        nodeToCheck = nodeToCheck.parent;
      }

      const comments = sourceCode.getCommentsBefore(nodeToCheck);

      for (const comment of comments) {
        const text =
          comment.type === "Block" ? `/*${comment.value}*/` : comment.value;
        const annotation = parseRendersAnnotation(text);
        if (annotation) {
          return annotation;
        }
      }

      return null;
    }

    /**
     * Get the returned JSX element names from a return statement or expression.
     * Returns an array because transparent wrappers may contain multiple children,
     * and expressions (ternaries, &&, .map) may yield multiple components.
     */
    function getReturnedElementNames(
      node: TSESTree.ReturnStatement | TSESTree.Expression
    ): string[] {
      const expr = node.type === "ReturnStatement" ? node.argument : node;

      // Empty return or return;
      if (!expr) {
        return ["null"];
      }

      // Direct JSX element: return <Header /> or return <Wrapper><Header /></Wrapper>
      if (expr.type === "JSXElement") {
        const name = getJSXElementName(expr);
        if (name && transparentComponents.has(name)) {
          // Look through transparent wrapper
          return extractChildElementNames(expr, transparentComponents);
        }
        return name ? [name] : [];
      }

      // For all other expressions (ternary, &&, .map, fragments, null, etc.)
      return extractJSXFromExpression(expr);
    }

    /**
     * Recursively collect all return statements from a block
     */
    function collectReturns(
      node: TSESTree.Node,
      results: Array<{ names: string[]; node: TSESTree.Node }>
    ): void {
      if (node.type === "ReturnStatement") {
        const names = getReturnedElementNames(node);
        if (names.length > 0) {
          results.push({ names, node });
        }
        return;
      }

      // Don't traverse into nested functions
      if (
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression"
      ) {
        return;
      }

      // Traverse child nodes (skip parent to avoid circular references)
      for (const key of Object.keys(node)) {
        if (key === "parent") continue; // Skip parent to avoid infinite loop

        const child = (node as unknown as Record<string, unknown>)[key];
        if (child && typeof child === "object") {
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item === "object" && "type" in item) {
                collectReturns(item as TSESTree.Node, results);
              }
            }
          } else if ("type" in child) {
            collectReturns(child as TSESTree.Node, results);
          }
        }
      }
    }

    /**
     * Get the @transparent annotation from a function node's leading comments
     */
    function getTransparentAnnotation(node: FunctionNode): TransparentAnnotation | null {
      let varDeclarator: TSESTree.VariableDeclarator | null =
        node.parent?.type === "VariableDeclarator" ? node.parent : null;

      if (!varDeclarator) {
        varDeclarator = getWrappingVariableDeclarator(node, additionalComponentWrappers);
      }

      let nodeToCheck: TSESTree.Node =
        varDeclarator?.parent?.type === "VariableDeclaration"
          ? varDeclarator.parent
          : node;

      if (
        nodeToCheck.parent?.type === "ExportNamedDeclaration" ||
        nodeToCheck.parent?.type === "ExportDefaultDeclaration"
      ) {
        nodeToCheck = nodeToCheck.parent;
      }

      const comments = sourceCode.getCommentsBefore(nodeToCheck);

      for (const comment of comments) {
        const text =
          comment.type === "Block" ? `/*${comment.value}*/` : comment.value;
        const ta = parseTransparentAnnotation(text);
        if (ta) {
          return ta;
        }
      }

      return null;
    }

    /**
     * First pass: collect component annotations
     */
    function collectAnnotation(node: FunctionNode): void {
      const componentName = getComponentName(node);

      // Check for @transparent annotation
      if (componentName && isComponentName(componentName)) {
        const ta = getTransparentAnnotation(node);
        if (ta) {
          localTransparentComponents.set(componentName, new Set(ta.propNames));
        }
      }

      const annotation = getRendersAnnotation(node);
      if (!annotation) {
        return;
      }

      if (componentName && isComponentName(componentName)) {
        // Add to local render map for chain resolution
        localRenderMap.set(componentName, annotation);

        // Queue for validation
        functionsToValidate.push({ node, annotation, componentName });
      }
    }

    /**
     * Check if a return value is "nullish" (null, undefined, false)
     * These are valid for optional (@renders?) and many (@renders*) modifiers
     */
    function isNullishReturn(name: string): boolean {
      return name === "null" || name === "undefined" || name === "false";
    }

    /**
     * Check if a return is valid for the given annotation
     */
    function isValidReturn(
      name: string,
      annotation: RendersAnnotation,
      renderMap: ResolvedRenderMap,
      actualTypeId: string | undefined,
      expectedTypeId: string | undefined,
      expectedTypeIds: string[] | undefined
    ): boolean {
      // For optional and many modifiers, null/undefined/false are valid
      if (
        (annotation.modifier === "optional" ||
          annotation.modifier === "many") &&
        isNullishReturn(name)
      ) {
        return true;
      }

      // For many modifier, Fragment is valid (wrapper for multiple elements)
      if (annotation.modifier === "many" && name === "Fragment") {
        return true;
      }

      // Type-aware match through render chain (supports union types)
      if (canRenderComponentTyped(name, annotation.componentName, renderMap, {
        actualTypeId,
        expectedTypeId,
        expectedTypeIds,
      })) {
        return true;
      }

      return false;
    }

    /**
     * Format expected components for error message
     */
    function formatExpected(annotation: RendersAnnotation): string {
      if (annotation.componentNames.length === 1) {
        return annotation.componentName;
      }
      return annotation.componentNames.join(" | ");
    }

    /**
     * Second pass: validate return statements using render chain
     */
    function validateFunctions(): void {
      // Build the resolved render map with type IDs
      const resolvedRenderMap = crossFileResolver.buildResolvedRenderMap(localRenderMap);

      // Build merged transparency map: settings + local + cross-file imports
      transparentComponents = new Map<string, Set<string>>();
      for (const [name, props] of settingsTransparentComponents) {
        transparentComponents.set(name, props);
      }
      const resolvedTransparent = crossFileResolver.resolveTransparentComponents(localTransparentComponents);
      for (const [name, props] of resolvedTransparent) {
        transparentComponents.set(name, props);
      }

      for (const { node, annotation, componentName } of functionsToValidate) {
        // Skip return validation for @renders! (unchecked)
        if (annotation.unchecked) {
          continue;
        }

        // Use the expanded annotation from the resolved render map (handles type alias expansion)
        const expandedAnnotation = resolvedRenderMap.get(componentName) ?? annotation;

        // Get the expected type IDs for the annotation target (supports union types)
        const expectedTypeId = crossFileResolver.getComponentTypeId(expandedAnnotation.componentName) ?? undefined;
        const expectedTypeIds = expandedAnnotation.componentNames
          .map((name) => crossFileResolver.getComponentTypeId(name))
          .filter((id): id is string => id !== null);

        // Collect all return statements/expressions
        const returnedItems: Array<{ names: string[]; node: TSESTree.Node }> = [];

        // Handle arrow function with implicit return
        if (
          node.type === "ArrowFunctionExpression" &&
          node.body.type !== "BlockStatement"
        ) {
          const names = getReturnedElementNames(node.body);
          if (names.length > 0) {
            returnedItems.push({ names, node: node.body });
          }
        } else {
          // Traverse the function body to find all return statements
          const body =
            node.type === "ArrowFunctionExpression"
              ? (node.body as TSESTree.BlockStatement)
              : node.body;

          if (body) {
            collectReturns(body, returnedItems);
          }
        }

        // Validate each return
        for (const { names, node: returnNode } of returnedItems) {
          // For transparent wrappers, ALL extracted children must be valid
          // For non-transparent returns, names will have a single element
          const allValid = names.every((name) => {
            const actualTypeId = crossFileResolver.getComponentTypeId(name) ?? undefined;
            return isValidReturn(name, expandedAnnotation, resolvedRenderMap, actualTypeId, expectedTypeId, expectedTypeIds.length > 0 ? expectedTypeIds : undefined);
          });

          if (!allValid) {
            // Find the first invalid name for the error message
            const invalidName = names.find((name) => {
              const actualTypeId = crossFileResolver.getComponentTypeId(name) ?? undefined;
              return !isValidReturn(name, expandedAnnotation, resolvedRenderMap, actualTypeId, expectedTypeId, expectedTypeIds.length > 0 ? expectedTypeIds : undefined);
            });

            context.report({
              node: returnNode,
              messageId: "invalidRenderReturn",
              data: {
                expected: formatExpected(expandedAnnotation),
                actual: invalidName ?? names[0],
              },
            });
          }
        }
      }
    }

    return {
      // First pass: collect all annotations
      FunctionDeclaration: collectAnnotation,
      FunctionExpression: collectAnnotation,
      ArrowFunctionExpression: collectAnnotation,

      // Second pass: validate when we've seen the whole program
      "Program:exit": validateFunctions,
    };
  },
});
