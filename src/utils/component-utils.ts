import type { TSESTree } from "@typescript-eslint/utils";

/**
 * Check if a name is a React component name (PascalCase)
 * React convention: components start with uppercase, HTML elements are lowercase
 */
export function isComponentName(name: string): boolean {
  if (!name || name.length === 0) {
    return false;
  }
  // Component names must start with an uppercase letter
  return /^[A-Z]/.test(name);
}

/**
 * Get the element name from a JSX element node
 * Handles:
 * - Simple identifiers: <Header /> -> "Header"
 * - Member expressions: <Menu.Item /> -> "Menu.Item"
 * - Deeply nested: <UI.Menu.Item /> -> "UI.Menu.Item"
 *
 * Returns null for unsupported patterns (JSXNamespacedName)
 */
export function getJSXElementName(node: TSESTree.JSXElement): string | null {
  const { name } = node.openingElement;
  return resolveJSXName(name);
}

const REACT_WRAPPER_NAMES = new Set(["forwardRef", "memo"]);

/**
 * Check if a CallExpression is a known React wrapper (forwardRef, memo).
 * Matches both `forwardRef(...)` and `React.forwardRef(...)`.
 */
export function isReactWrapperCall(
  node: TSESTree.CallExpression
): boolean {
  const { callee } = node;

  if (callee.type === "Identifier") {
    return REACT_WRAPPER_NAMES.has(callee.name);
  }

  if (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    callee.property.type === "Identifier"
  ) {
    return REACT_WRAPPER_NAMES.has(callee.property.name);
  }

  return false;
}

type FunctionNode =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/**
 * Walk up from a function node through React wrapper calls (forwardRef, memo)
 * to find the enclosing VariableDeclarator, if any.
 *
 * Handles patterns like:
 *   const X = forwardRef((props, ref) => ...)
 *   const X = memo(() => ...)
 *   const X = memo(forwardRef((props, ref) => ...))
 */
export function getWrappingVariableDeclarator(
  node: FunctionNode
): TSESTree.VariableDeclarator | null {
  let current: TSESTree.Node = node;

  // Walk up through CallExpression layers that are React wrappers
  while (
    current.parent?.type === "CallExpression" &&
    isReactWrapperCall(current.parent)
  ) {
    current = current.parent;
  }

  // Check if we arrived at a VariableDeclarator
  if (
    current.parent?.type === "VariableDeclarator" &&
    current.parent.id.type === "Identifier"
  ) {
    return current.parent;
  }

  return null;
}

/**
 * Recursively resolve a JSX name to a string
 */
function resolveJSXName(
  name:
    | TSESTree.JSXIdentifier
    | TSESTree.JSXMemberExpression
    | TSESTree.JSXNamespacedName
): string | null {
  switch (name.type) {
    case "JSXIdentifier":
      return name.name;

    case "JSXMemberExpression": {
      const objectName = resolveJSXName(name.object);
      if (objectName === null) {
        return null;
      }
      return `${objectName}.${name.property.name}`;
    }

    case "JSXNamespacedName":
      // XML namespace syntax (svg:rect) - not commonly used in React
      return null;

    default:
      return null;
  }
}
