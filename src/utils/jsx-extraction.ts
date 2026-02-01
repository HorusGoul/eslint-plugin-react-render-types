import type { TSESTree } from "@typescript-eslint/utils";
import { getJSXElementName } from "./component-utils.js";

/**
 * Recursively extract component names from a JSX expression.
 * Handles:
 * - Direct JSX elements: <Header />
 * - JSX fragments: <></>
 * - Null/undefined literals
 * - Conditional expressions: cond ? <A /> : <B />
 * - Logical expressions: cond && <A />, a || <B />
 * - .map()/.flatMap() callbacks: items.map(i => <A />)
 */
export function extractJSXFromExpression(
  expr: TSESTree.Expression | TSESTree.JSXEmptyExpression,
  maxDepth: number = 10
): string[] {
  if (maxDepth <= 0) return [];

  switch (expr.type) {
    case "JSXElement": {
      const name = getJSXElementName(expr);
      return name ? [name] : [];
    }

    case "JSXFragment": {
      // Extract from fragment children (expression containers, JSX elements)
      const fragmentResults: string[] = [];
      for (const child of expr.children) {
        if (child.type === "JSXElement") {
          const name = getJSXElementName(child);
          if (name) fragmentResults.push(name);
        } else if (
          child.type === "JSXExpressionContainer" &&
          child.expression.type !== "JSXEmptyExpression"
        ) {
          fragmentResults.push(
            ...extractJSXFromExpression(child.expression, maxDepth - 1)
          );
        }
      }
      // If we extracted children, return them; otherwise return Fragment itself
      return fragmentResults.length > 0 ? fragmentResults : ["Fragment"];
    }

    case "Literal":
      if (expr.value === null) return ["null"];
      if (expr.value === false) return ["false"];
      return [];

    case "Identifier":
      if (expr.name === "undefined") return ["undefined"];
      return [];

    case "ConditionalExpression":
      return [
        ...extractJSXFromExpression(expr.consequent, maxDepth - 1),
        ...extractJSXFromExpression(expr.alternate, maxDepth - 1),
      ];

    case "LogicalExpression":
      if (expr.operator === "&&") {
        // For &&, the result is either falsy (left) or right
        return extractJSXFromExpression(expr.right, maxDepth - 1);
      }
      // || and ?? — either side could be the result
      return [
        ...extractJSXFromExpression(expr.left, maxDepth - 1),
        ...extractJSXFromExpression(expr.right, maxDepth - 1),
      ];

    case "CallExpression":
      return extractJSXFromCallExpression(expr, maxDepth - 1);

    default:
      return [];
  }
}

/**
 * Extract JSX from .map() and .flatMap() callback arguments.
 */
function extractJSXFromCallExpression(
  expr: TSESTree.CallExpression,
  maxDepth: number
): string[] {
  if (expr.callee.type !== "MemberExpression") return [];
  if (expr.callee.property.type !== "Identifier") return [];

  const method = expr.callee.property.name;
  if (method !== "map" && method !== "flatMap") return [];

  const callback = expr.arguments[0];
  if (!callback) return [];

  if (callback.type === "ArrowFunctionExpression") {
    if (callback.body.type !== "BlockStatement") {
      // Expression body: items.map(i => <X />)
      return extractJSXFromExpression(callback.body, maxDepth);
    }
    // Block body: items.map(i => { return <X />; })
    return extractJSXFromBlock(callback.body, maxDepth);
  }

  if (callback.type === "FunctionExpression") {
    return extractJSXFromBlock(callback.body, maxDepth);
  }

  return [];
}

/**
 * Extract JSX from return statements in a block body.
 * Does not recurse into nested functions.
 */
function extractJSXFromBlock(
  block: TSESTree.BlockStatement,
  maxDepth: number
): string[] {
  const results: string[] = [];

  for (const stmt of block.body) {
    if (stmt.type === "ReturnStatement" && stmt.argument) {
      results.push(...extractJSXFromExpression(stmt.argument, maxDepth));
    }
  }

  return results;
}

/**
 * Extract child element names from a JSX element, looking through
 * transparent wrappers and expression containers.
 */
export function extractChildElementNames(
  jsxElement: TSESTree.JSXElement,
  transparentComponents: Set<string>,
  visited: Set<string> = new Set(),
  maxDepth: number = 10
): string[] {
  if (maxDepth <= 0) return [];

  const elementName = getJSXElementName(jsxElement);
  if (elementName) {
    if (visited.has(elementName)) return [];
    visited.add(elementName);
  }

  const results: string[] = [];

  for (const child of jsxElement.children) {
    if (child.type === "JSXElement") {
      const childName = getJSXElementName(child);
      if (childName && transparentComponents.has(childName)) {
        results.push(
          ...extractChildElementNames(
            child,
            transparentComponents,
            new Set(visited),
            maxDepth - 1
          )
        );
      } else if (childName) {
        results.push(childName);
      }
    } else if (
      child.type === "JSXExpressionContainer" &&
      child.expression.type !== "JSXEmptyExpression"
    ) {
      results.push(
        ...extractJSXFromExpression(child.expression, maxDepth - 1)
      );
    }
  }

  return results;
}
