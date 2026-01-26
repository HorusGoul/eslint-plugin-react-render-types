import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation } from "../utils/jsdoc-parser.js";
import { getJSXElementName, isComponentName } from "../utils/component-utils.js";
import { canRenderComponent } from "../utils/render-chain.js";
import { createCrossFileResolver } from "../utils/cross-file-resolver.js";
import type { RendersAnnotation } from "../types/index.js";

type MessageIds = "invalidRenderProp" | "invalidRenderChildren";
type RenderMap = Map<string, RendersAnnotation>;

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
    const localRenderMap: RenderMap = new Map();

    // Store prop annotations from interfaces/types
    // Map of "ComponentName.propName" -> RendersAnnotation
    const propAnnotations = new Map<string, RendersAnnotation>();

    // Try to get typed parser services for cross-file resolution
    let crossFileResolver: ReturnType<typeof createCrossFileResolver> | null = null;
    try {
      const parserServices = ESLintUtils.getParserServices(context, true);
      if (parserServices.program) {
        crossFileResolver = createCrossFileResolver({
          parserServices,
          sourceCode,
          filename: context.filename,
        });
      }
    } catch {
      // Typed linting not enabled, cross-file resolution not available
    }

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
     * Check if a return is valid for the given annotation
     */
    function isNullishReturn(name: string): boolean {
      return name === "null" || name === "undefined" || name === "false";
    }

    function isValidValue(
      name: string,
      annotation: RendersAnnotation,
      renderMap: RenderMap
    ): boolean {
      if (canRenderComponent(name, annotation.componentName, renderMap)) {
        return true;
      }

      if (
        (annotation.modifier === "optional" ||
          annotation.modifier === "many") &&
        isNullishReturn(name)
      ) {
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
     * Collect @renders annotations from function components
     */
    function collectComponentAnnotation(node: FunctionNode): void {
      // For variable declarations (const MyComp = () => ...), check parent
      const nodeToCheck =
        node.parent?.type === "VariableDeclarator" &&
        node.parent.parent?.type === "VariableDeclaration"
          ? node.parent.parent
          : node;

      const annotation = getRendersAnnotationFromComments(nodeToCheck);
      if (!annotation) {
        return;
      }

      const componentName = getComponentName(node);
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
      jsxElement: TSESTree.JSXElement,
      renderMap: RenderMap
    ): void {
      if (attr.name.type !== "JSXIdentifier" || !attr.value) {
        return;
      }

      const propName = attr.name.name;
      const elementName = getJSXElementName(jsxElement);

      if (!elementName) {
        return;
      }

      // Try to find annotation for this prop
      // Check all interfaces for matching prop annotation
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
      let passedValue: string | null = null;

      if (attr.value.type === "JSXExpressionContainer") {
        passedValue = getJSXNameFromExpression(attr.value.expression);
      } else if (attr.value.type === "JSXElement") {
        passedValue = getJSXElementName(attr.value);
      }

      if (passedValue && !isValidValue(passedValue, annotation, renderMap)) {
        context.report({
          node: attr.value,
          messageId: "invalidRenderProp",
          data: {
            propName,
            expected: annotation.componentName,
            actual: passedValue,
          },
        });
      }
    }

    /**
     * Validate JSX children against @renders annotation
     */
    function validateJSXChildren(
      node: TSESTree.JSXElement,
      renderMap: RenderMap
    ): void {
      const elementName = getJSXElementName(node);
      if (!elementName) {
        return;
      }

      // Try to find annotation for this component's children prop
      // Look for "{ElementName}Props.children" or "{ElementName}.children"
      let annotation: RendersAnnotation | null = null;

      // Check common naming conventions for props interfaces
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

      // Validate each child
      for (const child of node.children) {
        if (child.type === "JSXElement") {
          const childName = getJSXElementName(child);
          if (childName && !isValidValue(childName, annotation, renderMap)) {
            context.report({
              node: child,
              messageId: "invalidRenderChildren",
              data: {
                expected: annotation.componentName,
                actual: childName,
              },
            });
          }
        } else if (child.type === "JSXExpressionContainer") {
          const childName = getJSXNameFromExpression(child.expression);
          if (childName && !isValidValue(childName, annotation, renderMap)) {
            context.report({
              node: child,
              messageId: "invalidRenderChildren",
              data: {
                expected: annotation.componentName,
                actual: childName,
              },
            });
          }
        }
      }
    }

    /**
     * Validate all queued JSX elements
     */
    function validateAllJSXElements(): void {
      // Build the effective render map:
      // - If cross-file resolution is available, augment local map with imported components
      // - Otherwise, use only local definitions
      let effectiveRenderMap: RenderMap;

      if (crossFileResolver) {
        effectiveRenderMap = crossFileResolver.buildAugmentedRenderMap(localRenderMap);
      } else {
        effectiveRenderMap = localRenderMap;
      }

      for (const node of jsxElementsToValidate) {
        // Validate attributes
        for (const attr of node.openingElement.attributes) {
          if (attr.type === "JSXAttribute") {
            validateJSXAttribute(attr, node, effectiveRenderMap);
          }
        }

        // Validate children
        validateJSXChildren(node, effectiveRenderMap);
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
