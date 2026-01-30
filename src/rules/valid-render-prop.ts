import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation, parseTransparentAnnotation } from "../utils/jsdoc-parser.js";
import { getJSXElementName, isComponentName } from "../utils/component-utils.js";
import { canRenderComponentTyped } from "../utils/render-chain.js";
import { createCrossFileResolver } from "../utils/cross-file-resolver.js";
import type { RendersAnnotation, ResolvedRenderMap } from "../types/index.js";

type MessageIds = "invalidRenderProp" | "invalidRenderChildren";

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export default createRule<[], MessageIds>({
  name: "valid-render-prop",
  meta: {
    type: "problem",
    docs: {
      description:
        "Verify props with @renders annotations receive compatible components",
    },
    messages: {
      invalidRenderProp:
        "Prop '{{propName}}' expects @renders {{'{{expected}}'}} but received {{'{{actual}}'}}",
      invalidRenderChildren:
        "Children expect @renders {{'{{expected}}'}} but received {{'{{actual}}'}}",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    // Build a map of component names to their @renders annotations
    const localRenderMap: Map<string, RendersAnnotation> = new Map();

    // Store prop annotations from interfaces/types
    // Map of "ComponentName.propName" -> RendersAnnotation
    const propAnnotations = new Map<string, RendersAnnotation>();

    // Get typed parser services (required for this rule)
    const parserServices = ESLintUtils.getParserServices(context);
    const crossFileResolver = createCrossFileResolver({
      parserServices,
      sourceCode,
      filename: context.filename,
    });

    // Track components marked as @transparent
    const transparentComponents = new Set<string>();

    // Queue JSX elements for validation in Program:exit
    const jsxElementsToValidate: TSESTree.JSXElement[] = [];

    /**
     * Get the @renders annotation from a function node's leading comments
     */
    function getRendersAnnotationFromComments(
      node: TSESTree.Node
    ): RendersAnnotation | null {
      const comments = sourceCode.getCommentsBefore(node);

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
     * Get component name from a function node
     */
    function getComponentName(node: FunctionNode): string | null {
      if (node.type === "FunctionDeclaration" && node.id) {
        return node.id.name;
      }

      if (
        node.parent?.type === "VariableDeclarator" &&
        node.parent.id.type === "Identifier"
      ) {
        return node.parent.id.name;
      }

      return null;
    }

    /**
     * Check if a value is "nullish" (null, undefined, false)
     */
    function isNullishValue(name: string): boolean {
      return name === "null" || name === "undefined" || name === "false";
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
     * Get all expected type IDs for an annotation (supports union types)
     */
    function getExpectedTypeIds(annotation: RendersAnnotation): string[] {
      return annotation.componentNames
        .map((name) => crossFileResolver.getComponentTypeId(name))
        .filter((id): id is string => id !== null);
    }

    /**
     * Type-aware validation for prop values (supports union types)
     */
    function isValidValue(
      name: string,
      annotation: RendersAnnotation,
      renderMap: ResolvedRenderMap,
      actualTypeId: string | undefined,
      expectedTypeId: string | undefined,
      expectedTypeIds: string[] | undefined
    ): boolean {
      if (
        (annotation.modifier === "optional" ||
          annotation.modifier === "many") &&
        isNullishValue(name)
      ) {
        return true;
      }

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
     * Get JSX element name from expression
     */
    function getJSXNameFromExpression(
      expr: TSESTree.Expression | TSESTree.JSXEmptyExpression
    ): string | null {
      if (expr.type === "JSXElement") {
        return getJSXElementName(expr);
      }

      if (expr.type === "Literal" && expr.value === null) {
        return "null";
      }

      if (expr.type === "Identifier" && expr.name === "undefined") {
        return "undefined";
      }

      return null;
    }

    /**
     * Recursively extract child JSX element names from a transparent wrapper.
     * Looks through nested transparent wrappers to find the actual components.
     */
    function extractChildElementNames(
      jsxElement: TSESTree.JSXElement,
      visited: Set<string> = new Set(),
      maxDepth: number = 10
    ): string[] {
      if (maxDepth <= 0) return [];

      const elementName = getJSXElementName(jsxElement);
      if (elementName) {
        if (visited.has(elementName)) return []; // cycle detection
        visited.add(elementName);
      }

      const results: string[] = [];

      for (const child of jsxElement.children) {
        if (child.type === "JSXElement") {
          const childName = getJSXElementName(child);
          if (childName && transparentComponents.has(childName)) {
            // Nested transparent wrapper — recurse
            results.push(
              ...extractChildElementNames(
                child,
                new Set(visited),
                maxDepth - 1
              )
            );
          } else if (childName) {
            results.push(childName);
          }
        }
      }

      return results;
    }

    /**
     * Collect @renders and @transparent annotations from function components
     */
    function collectComponentAnnotation(node: FunctionNode): void {
      // For variable declarations (const MyComp = () => ...), check parent
      const nodeToCheck =
        node.parent?.type === "VariableDeclarator" &&
        node.parent.parent?.type === "VariableDeclaration"
          ? node.parent.parent
          : node;

      // Check for @transparent
      const componentName = getComponentName(node);
      if (componentName && isComponentName(componentName)) {
        const comments = sourceCode.getCommentsBefore(nodeToCheck);
        for (const comment of comments) {
          const text =
            comment.type === "Block" ? `/*${comment.value}*/` : comment.value;
          if (parseTransparentAnnotation(text)) {
            transparentComponents.add(componentName);
            break;
          }
        }
      }

      const annotation = getRendersAnnotationFromComments(nodeToCheck);
      if (!annotation) {
        return;
      }

      if (componentName && isComponentName(componentName)) {
        localRenderMap.set(componentName, annotation);
      }
    }

    /**
     * Collect @renders annotations from interface properties
     */
    function collectPropAnnotation(
      node: TSESTree.TSPropertySignature,
      interfaceName: string
    ): void {
      if (node.key.type !== "Identifier") {
        return;
      }

      const propName = node.key.name;
      const annotation = getRendersAnnotationFromComments(node);

      if (annotation) {
        propAnnotations.set(`${interfaceName}.${propName}`, annotation);
      }
    }

    /**
     * Process interface declaration
     */
    function processInterface(node: TSESTree.TSInterfaceDeclaration): void {
      const interfaceName = node.id.name;

      for (const member of node.body.body) {
        if (member.type === "TSPropertySignature") {
          collectPropAnnotation(member, interfaceName);
        }
      }
    }

    /**
     * Validate JSX attribute against @renders annotation
     */
    function validateJSXAttribute(
      attr: TSESTree.JSXAttribute,
      renderMap: ResolvedRenderMap
    ): void {
      if (attr.name.type !== "JSXIdentifier" || !attr.value) {
        return;
      }

      const propName = attr.name.name;

      // Try to find annotation for this prop
      let annotation: RendersAnnotation | null = null;

      for (const [key, ann] of propAnnotations) {
        if (key.endsWith(`.${propName}`)) {
          annotation = ann;
          break;
        }
      }

      if (!annotation) {
        return;
      }

      // Get the value being passed to the prop
      let passedValues: string[] = [];
      let valueNode: TSESTree.Node = attr.value;

      if (attr.value.type === "JSXExpressionContainer") {
        const expr = attr.value.expression;
        if (expr.type === "JSXElement") {
          const name = getJSXElementName(expr);
          if (name && transparentComponents.has(name)) {
            passedValues = extractChildElementNames(expr);
          } else if (name) {
            passedValues = [name];
          }
        } else {
          const name = getJSXNameFromExpression(expr);
          if (name) {
            passedValues = [name];
          }
        }
      } else if (attr.value.type === "JSXElement") {
        const name = getJSXElementName(attr.value);
        if (name && transparentComponents.has(name)) {
          passedValues = extractChildElementNames(attr.value);
        } else if (name) {
          passedValues = [name];
        }
      }

      if (passedValues.length > 0) {
        const expectedTypeId = crossFileResolver.getComponentTypeId(annotation.componentName) ?? undefined;
        const expectedTypeIds = getExpectedTypeIds(annotation);

        // All extracted values must be valid
        for (const passedValue of passedValues) {
          const actualTypeId = crossFileResolver.getComponentTypeId(passedValue) ?? undefined;

          if (!isValidValue(passedValue, annotation, renderMap, actualTypeId, expectedTypeId, expectedTypeIds.length > 0 ? expectedTypeIds : undefined)) {
            context.report({
              node: valueNode,
              messageId: "invalidRenderProp",
              data: {
                propName,
                expected: formatExpected(annotation),
                actual: passedValue,
              },
            });
          }
        }
      }
    }

    /**
     * Validate JSX children against @renders annotation
     */
    function validateJSXChildren(
      node: TSESTree.JSXElement,
      renderMap: ResolvedRenderMap
    ): void {
      const elementName = getJSXElementName(node);
      if (!elementName) {
        return;
      }

      // Try to find annotation for this component's children prop
      let annotation: RendersAnnotation | null = null;

      const possibleInterfaceNames = [
        `${elementName}Props.children`,
        `${elementName}.children`,
        `I${elementName}Props.children`,
      ];

      for (const interfaceKey of possibleInterfaceNames) {
        const ann = propAnnotations.get(interfaceKey);
        if (ann) {
          annotation = ann;
          break;
        }
      }

      if (!annotation) {
        return;
      }

      const expectedTypeId = crossFileResolver.getComponentTypeId(annotation.componentName) ?? undefined;
      const expectedTypeIds = getExpectedTypeIds(annotation);

      // Validate each child
      for (const child of node.children) {
        if (child.type === "JSXElement") {
          const childName = getJSXElementName(child);
          if (childName && transparentComponents.has(childName)) {
            // Look through transparent wrapper
            const extractedNames = extractChildElementNames(child);
            for (const name of extractedNames) {
              const actualTypeId = crossFileResolver.getComponentTypeId(name) ?? undefined;
              if (!isValidValue(name, annotation, renderMap, actualTypeId, expectedTypeId, expectedTypeIds.length > 0 ? expectedTypeIds : undefined)) {
                context.report({
                  node: child,
                  messageId: "invalidRenderChildren",
                  data: {
                    expected: formatExpected(annotation),
                    actual: name,
                  },
                });
              }
            }
          } else if (childName) {
            const actualTypeId = crossFileResolver.getComponentTypeId(childName) ?? undefined;
            if (!isValidValue(childName, annotation, renderMap, actualTypeId, expectedTypeId, expectedTypeIds.length > 0 ? expectedTypeIds : undefined)) {
              context.report({
                node: child,
                messageId: "invalidRenderChildren",
                data: {
                  expected: formatExpected(annotation),
                  actual: childName,
                },
              });
            }
          }
        } else if (child.type === "JSXExpressionContainer") {
          const childName = getJSXNameFromExpression(child.expression);
          if (childName) {
            const actualTypeId = crossFileResolver.getComponentTypeId(childName) ?? undefined;
            if (!isValidValue(childName, annotation, renderMap, actualTypeId, expectedTypeId, expectedTypeIds.length > 0 ? expectedTypeIds : undefined)) {
              context.report({
                node: child,
                messageId: "invalidRenderChildren",
                data: {
                  expected: formatExpected(annotation),
                  actual: childName,
                },
              });
            }
          }
        }
      }
    }

    /**
     * Validate all queued JSX elements
     */
    function validateAllJSXElements(): void {
      const resolvedRenderMap = crossFileResolver.buildResolvedRenderMap(localRenderMap);

      // Expand type aliases in prop annotations
      for (const [key, annotation] of propAnnotations) {
        const expanded = crossFileResolver.expandTypeAliases(annotation);
        if (expanded !== annotation) {
          propAnnotations.set(key, expanded);
        }
      }

      for (const node of jsxElementsToValidate) {
        // Validate attributes
        for (const attr of node.openingElement.attributes) {
          if (attr.type === "JSXAttribute") {
            validateJSXAttribute(attr, resolvedRenderMap);
          }
        }

        // Validate children
        validateJSXChildren(node, resolvedRenderMap);
      }
    }

    return {
      // Collect component @renders annotations
      FunctionDeclaration: collectComponentAnnotation,
      FunctionExpression: collectComponentAnnotation,
      ArrowFunctionExpression: collectComponentAnnotation,

      // Collect prop annotations from interfaces
      TSInterfaceDeclaration: processInterface,

      // Queue JSX elements for validation
      JSXElement(node) {
        jsxElementsToValidate.push(node);
      },

      // Validate all JSX elements once we've collected all annotations
      "Program:exit": validateAllJSXElements,
    };
  },
});
