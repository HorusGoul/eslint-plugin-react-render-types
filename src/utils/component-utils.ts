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
