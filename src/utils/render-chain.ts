import type { RendersAnnotation } from "../types/index.js";

const DEFAULT_MAX_DEPTH = 10;

/**
 * Check if a component can render the expected component type.
 * This handles both direct matches and chained rendering.
 *
 * Examples:
 * - "Header" can render "Header" (direct match)
 * - "MyHeader" can render "Header" if MyHeader has @renders {Header}
 * - "CustomHeader" can render "Header" if:
 *   - CustomHeader @renders {MyHeader} AND
 *   - MyHeader @renders {Header}
 *
 * @param actualComponent - The component being returned/used
 * @param expectedComponent - The component required by @renders annotation
 * @param renderMap - Map of component names to their @renders annotations
 * @param maxDepth - Maximum chain depth to prevent infinite loops (default: 10)
 */
export function canRenderComponent(
  actualComponent: string,
  expectedComponent: string,
  renderMap: Map<string, RendersAnnotation>,
  maxDepth: number = DEFAULT_MAX_DEPTH
): boolean {
  // Direct match
  if (actualComponent === expectedComponent) {
    return true;
  }

  // Check if actualComponent has a @renders annotation
  const annotation = renderMap.get(actualComponent);
  if (!annotation) {
    return false;
  }

  // Follow the chain with cycle detection
  const visited = new Set<string>([actualComponent]);
  let current = annotation.componentName;
  let depth = 0;

  while (depth < maxDepth) {
    // Found the expected component
    if (current === expectedComponent) {
      return true;
    }

    // Cycle detection
    if (visited.has(current)) {
      return false;
    }
    visited.add(current);

    // Follow the chain
    const nextAnnotation = renderMap.get(current);
    if (!nextAnnotation) {
      return false;
    }

    current = nextAnnotation.componentName;
    depth++;
  }

  return false;
}

/**
 * Resolve the full render chain for a component.
 * Returns an array of component names in the chain.
 *
 * Example:
 * - A @renders {B}, B @renders {C} => resolveRenderChain("A") returns ["B", "C"]
 *
 * @param componentName - The starting component
 * @param renderMap - Map of component names to their @renders annotations
 * @param maxDepth - Maximum chain depth (default: 10)
 */
export function resolveRenderChain(
  componentName: string,
  renderMap: Map<string, RendersAnnotation>,
  maxDepth: number = DEFAULT_MAX_DEPTH
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>([componentName]);

  let current = componentName;
  let depth = 0;

  while (depth < maxDepth) {
    const annotation = renderMap.get(current);
    if (!annotation) {
      break;
    }

    const next = annotation.componentName;

    // Cycle detection
    if (visited.has(next)) {
      break;
    }

    chain.push(next);
    visited.add(next);
    current = next;
    depth++;
  }

  return chain;
}
