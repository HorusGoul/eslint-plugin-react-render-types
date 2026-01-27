import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation } from "../utils/jsdoc-parser.js";
import { getJSXElementName, isComponentName } from "../utils/component-utils.js";
import { canRenderComponentTyped } from "../utils/render-chain.js";
import { createCrossFileResolver } from "../utils/cross-file-resolver.js";
import type { RendersAnnotation, ResolvedRenderMap } from "../types/index.js";

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
        "Component annotated with @renders {{'{{expected}}'}} but returns {{'{{actual}}'}}",
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

      return null;
    }

    /**
     * Get the @renders annotation from a function node's leading comments
     */
    function getRendersAnnotation(node: FunctionNode): RendersAnnotation | null {
      // For variable declarations (const MyComp = () => ...), check parent
      const nodeToCheck =
        node.parent?.type === "VariableDeclarator" &&
        node.parent.parent?.type === "VariableDeclaration"
          ? node.parent.parent
          : node;

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
     * Get the returned JSX element name from a return statement or expression
     */
    function getReturnedElementName(
      node: TSESTree.ReturnStatement | TSESTree.Expression
    ): string | null {
      const expr = node.type === "ReturnStatement" ? node.argument : node;

      // Empty return or return;
      if (!expr) {
        return "null";
      }

      // Direct JSX element: return <Header />
      if (expr.type === "JSXElement") {
        return getJSXElementName(expr);
      }

      // JSX fragment: return <>...</>
      if (expr.type === "JSXFragment") {
        return "Fragment";
      }

      // Literal null: return null;
      if (expr.type === "Literal" && expr.value === null) {
        return "null";
      }

      // Identifier undefined: return undefined;
      if (expr.type === "Identifier" && expr.name === "undefined") {
        return "undefined";
      }

      return null;
    }

    /**
     * Recursively collect all return statements from a block
     */
    function collectReturns(
      node: TSESTree.Node,
      results: Array<{ name: string; node: TSESTree.Node }>
    ): void {
      if (node.type === "ReturnStatement") {
        const name = getReturnedElementName(node);
        if (name !== null) {
          results.push({ name, node });
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
     * First pass: collect component annotations
     */
    function collectAnnotation(node: FunctionNode): void {
      const annotation = getRendersAnnotation(node);
      if (!annotation) {
        return;
      }

      const componentName = getComponentName(node);
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
      expectedTypeId: string | undefined
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

      // Type-aware match through render chain
      if (canRenderComponentTyped(name, annotation.componentName, renderMap, {
        actualTypeId,
        expectedTypeId,
      })) {
        return true;
      }

      return false;
    }

    /**
     * Second pass: validate return statements using render chain
     */
    function validateFunctions(): void {
      // Build the resolved render map with type IDs
      const resolvedRenderMap = crossFileResolver.buildResolvedRenderMap(localRenderMap);

      for (const { node, annotation } of functionsToValidate) {
        // Get the expected type ID for the annotation target
        const expectedTypeId = crossFileResolver.getComponentTypeId(annotation.componentName) ?? undefined;

        // Collect all return statements/expressions
        const returnedNames: Array<{ name: string; node: TSESTree.Node }> = [];

        // Handle arrow function with implicit return
        if (
          node.type === "ArrowFunctionExpression" &&
          node.body.type !== "BlockStatement"
        ) {
          const name = getReturnedElementName(node.body);
          if (name !== null) {
            returnedNames.push({ name, node: node.body });
          }
        } else {
          // Traverse the function body to find all return statements
          const body =
            node.type === "ArrowFunctionExpression"
              ? (node.body as TSESTree.BlockStatement)
              : node.body;

          if (body) {
            collectReturns(body, returnedNames);
          }
        }

        // Validate each return
        for (const { name, node: returnNode } of returnedNames) {
          // Get the actual type ID for the returned component
          const actualTypeId = crossFileResolver.getComponentTypeId(name) ?? undefined;

          if (!isValidReturn(name, annotation, resolvedRenderMap, actualTypeId, expectedTypeId)) {
            context.report({
              node: returnNode,
              messageId: "invalidRenderReturn",
              data: {
                expected: annotation.componentName,
                actual: name,
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
