import type {
  RendersAnnotation,
  ResolvedRendersAnnotation,
  ResolvedRenderMap,
  ComponentTypeId,
} from "../types/index.js";

const DEFAULT_MAX_DEPTH = 10;

/**
 * Options for type-aware component validation
 */
export interface TypeAwareValidationOptions {
  /** The type ID of the actual component being used/returned */
  actualTypeId?: ComponentTypeId;
  /** The expected type ID from the @renders annotation target */
  expectedTypeId?: ComponentTypeId;
}

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

/**
 * Type-aware version of canRenderComponent that uses type IDs for validation.
 * This ensures that components are actually the same type, not just the same name.
 *
 * @param actualComponent - The component name being returned/used
 * @param expectedComponent - The component name required by @renders annotation
 * @param renderMap - Map of component names to their resolved annotations
 * @param options - Type IDs for the actual and expected components
 * @param maxDepth - Maximum chain depth (default: 10)
 */
export function canRenderComponentTyped(
  actualComponent: string,
  expectedComponent: string,
  renderMap: ResolvedRenderMap,
  options: TypeAwareValidationOptions = {},
  maxDepth: number = DEFAULT_MAX_DEPTH
): boolean {
  const { actualTypeId, expectedTypeId } = options;

  // If we have type IDs for both, use them for direct match
  if (actualTypeId && expectedTypeId) {
    if (actualTypeId === expectedTypeId) {
      return true;
    }
  } else {
    // Fallback: name-based direct match when type IDs unavailable
    if (actualComponent === expectedComponent) {
      return true;
    }
  }

  // Check if actualComponent has a @renders annotation
  const annotation = renderMap.get(actualComponent);
  if (!annotation) {
    return false;
  }

  // If the annotation has a targetTypeId and we have the expected type ID,
  // we can do a type-safe comparison
  if (annotation.targetTypeId && expectedTypeId) {
    if (annotation.targetTypeId === expectedTypeId) {
      return true;
    }
  }

  // Follow the chain with cycle detection
  const visited = new Set<string>([actualComponent]);
  let currentName = annotation.componentName;
  let currentAnnotation: ResolvedRendersAnnotation | undefined = annotation;
  let depth = 0;

  while (depth < maxDepth) {
    // Type-based match check
    if (currentAnnotation?.targetTypeId && expectedTypeId) {
      if (currentAnnotation.targetTypeId === expectedTypeId) {
        return true;
      }
    }

    // Name-based match (fallback)
    if (!expectedTypeId && currentName === expectedComponent) {
      return true;
    }

    // Cycle detection
    if (visited.has(currentName)) {
      return false;
    }
    visited.add(currentName);

    // Follow the chain
    const nextAnnotation = renderMap.get(currentName);
    if (!nextAnnotation) {
      return false;
    }

    currentName = nextAnnotation.componentName;
    currentAnnotation = nextAnnotation;
    depth++;
  }

  return false;
}
