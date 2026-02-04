import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation } from "../utils/jsdoc-parser.js";
import { isComponentName, getWrappingVariableDeclarator } from "../utils/component-utils.js";
import { getPluginSettings } from "../utils/settings.js";

type MessageIds = "missingRendersAnnotation";

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/**
 * Check if a function body contains JSX returns (making it a React component)
 */
function hasJSXReturn(node: FunctionNode): boolean {
  // Arrow function with implicit JSX return
  if (
    node.type === "ArrowFunctionExpression" &&
    node.body.type !== "BlockStatement"
  ) {
    return (
      node.body.type === "JSXElement" || node.body.type === "JSXFragment"
    );
  }

  // Function with block body - check for JSX returns
  const body =
    node.type === "ArrowFunctionExpression"
      ? (node.body as TSESTree.BlockStatement)
      : node.body;

  if (!body) {
    return false;
  }

  return containsJSXReturn(body);
}

/**
 * Recursively check if a node contains JSX return statements
 */
function containsJSXReturn(node: TSESTree.Node): boolean {
  if (node.type === "ReturnStatement" && node.argument) {
    if (
      node.argument.type === "JSXElement" ||
      node.argument.type === "JSXFragment"
    ) {
      return true;
    }
    // Check for conditional JSX: condition ? <A /> : <B />
    if (node.argument.type === "ConditionalExpression") {
      const { consequent, alternate } = node.argument;
      if (
        consequent.type === "JSXElement" ||
        consequent.type === "JSXFragment" ||
        alternate.type === "JSXElement" ||
        alternate.type === "JSXFragment"
      ) {
        return true;
      }
    }
    // Check for logical expression: condition && <A />
    if (node.argument.type === "LogicalExpression") {
      const { left, right } = node.argument;
      if (
        left.type === "JSXElement" ||
        left.type === "JSXFragment" ||
        right.type === "JSXElement" ||
        right.type === "JSXFragment"
      ) {
        return true;
      }
    }
  }

  // Don't traverse into nested functions
  if (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  ) {
    return false;
  }

  // Traverse child nodes
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;

    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === "object") {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === "object" && "type" in item) {
            if (containsJSXReturn(item as TSESTree.Node)) {
              return true;
            }
          }
        }
      } else if ("type" in child) {
        if (containsJSXReturn(child as TSESTree.Node)) {
          return true;
        }
      }
    }
  }

  return false;
}

export default createRule<[], MessageIds>({
  name: "require-renders-annotation",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require @renders annotation on React function components",
    },
    messages: {
      missingRendersAnnotation:
        "Component '{{componentName}}' is missing a @renders annotation",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    // Require typed parser services
    ESLintUtils.getParserServices(context);

    const { additionalComponentWrappers } = getPluginSettings(context.settings);

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

      // For functions inside React wrappers: forwardRef, memo
      const wrapper = getWrappingVariableDeclarator(node, additionalComponentWrappers);
      if (wrapper) {
        return wrapper.id.type === "Identifier" ? wrapper.id.name : null;
      }

      return null;
    }

    /**
     * Check if the function has a @renders annotation
     */
    function hasRendersAnnotation(node: FunctionNode): boolean {
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

      // For exported declarations, the JSDoc sits before `export`, not the
      // inner declaration — walk up to ExportNamedDeclaration / ExportDefaultDeclaration
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
        if (parseRendersAnnotation(text)) {
          return true;
        }
      }

      return false;
    }

    /**
     * Check if a function is a React component and validate it has @renders
     */
    function checkComponent(node: FunctionNode): void {
      const componentName = getComponentName(node);

      // Not a component if it doesn't have a PascalCase name
      if (!componentName || !isComponentName(componentName)) {
        return;
      }

      // Not a component if it doesn't return JSX
      if (!hasJSXReturn(node)) {
        return;
      }

      // Check if it has a @renders annotation
      if (!hasRendersAnnotation(node)) {
        // Report on the function name or the variable declaration
        const reportNode =
          node.type === "FunctionDeclaration" && node.id
            ? node.id
            : node.parent?.type === "VariableDeclarator" &&
                node.parent.id.type === "Identifier"
              ? node.parent.id
              : getWrappingVariableDeclarator(node, additionalComponentWrappers)?.id ?? node;

        context.report({
          node: reportNode,
          messageId: "missingRendersAnnotation",
          data: {
            componentName,
          },
        });
      }
    }

    return {
      FunctionDeclaration: checkComponent,
      FunctionExpression: checkComponent,
      ArrowFunctionExpression: checkComponent,
    };
  },
});
