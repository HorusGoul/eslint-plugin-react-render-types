import type {
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
  /** The expected type ID from the @renders annotation target (primary) */
  expectedTypeId?: ComponentTypeId;
  /** All expected type IDs when @renders uses a union type */
  expectedTypeIds?: ComponentTypeId[];
}

/**
 * Check if an actual type ID matches any of the expected type IDs
 */
function matchesAnyExpectedType(
  actualTypeId: ComponentTypeId | undefined,
  expectedTypeId: ComponentTypeId | undefined,
  expectedTypeIds: ComponentTypeId[] | undefined
): boolean {
  if (!actualTypeId) {
    return false;
  }

  // Check against single expected type ID
  if (expectedTypeId && actualTypeId === expectedTypeId) {
    return true;
  }

  // Check against union type IDs
  if (expectedTypeIds && expectedTypeIds.includes(actualTypeId)) {
    return true;
  }

  return false;
}

/**
 * Check if annotation's target type IDs match any of the expected type IDs
 */
function annotationMatchesExpectedTypes(
  annotation: ResolvedRendersAnnotation,
  expectedTypeId: ComponentTypeId | undefined,
  expectedTypeIds: ComponentTypeId[] | undefined
): boolean {
  // Check primary target type ID
  if (annotation.targetTypeId) {
    if (expectedTypeId && annotation.targetTypeId === expectedTypeId) {
      return true;
    }
    if (expectedTypeIds && expectedTypeIds.includes(annotation.targetTypeId)) {
      return true;
    }
  }

  // Check all target type IDs (for annotations with unions)
  if (annotation.targetTypeIds) {
    for (const targetTypeId of annotation.targetTypeIds) {
      if (expectedTypeId && targetTypeId === expectedTypeId) {
        return true;
      }
      if (expectedTypeIds && expectedTypeIds.includes(targetTypeId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a component can render the expected component type using type IDs.
 * This ensures that components are actually the same type, not just the same name.
 *
 * For union types like @renders {Header | Footer}, returning either Header OR Footer is valid.
 *
 * Examples:
 * - Header (type ID: "/path/Header.tsx:Header") can render Header (same type ID)
 * - MyHeader @renders {Header} can render Header if annotations match
 * - CustomHeader @renders {MyHeader} can render Header through chain resolution
 * - FlexComp @renders {Header | Footer} can return either Header or Footer
 *
 * @param actualComponent - The component name being returned/used
 * @param expectedComponent - The component name required by @renders annotation (primary)
 * @param renderMap - Map of component names to their resolved annotations
 * @param options - Type IDs for the actual and expected components
 * @param maxDepth - Maximum chain depth to prevent infinite loops (default: 10)
 */
export function canRenderComponentTyped(
  actualComponent: string,
  expectedComponent: string,
  renderMap: ResolvedRenderMap,
  options: TypeAwareValidationOptions = {},
  maxDepth: number = DEFAULT_MAX_DEPTH
): boolean {
  const { actualTypeId, expectedTypeId, expectedTypeIds } = options;

  // Direct type ID match (handles union types)
  if (matchesAnyExpectedType(actualTypeId, expectedTypeId, expectedTypeIds)) {
    return true;
  }

  // Check if actualComponent has a @renders annotation
  const annotation = renderMap.get(actualComponent);
  if (!annotation) {
    return false;
  }

  // If the annotation has target type IDs and we have expected type IDs,
  // we can do a type-safe comparison (handles union types)
  if (annotationMatchesExpectedTypes(annotation, expectedTypeId, expectedTypeIds)) {
    return true;
  }

  // Follow the chain with cycle detection
  const visited = new Set<string>([actualComponent]);
  let currentName = annotation.componentName;
  let currentAnnotation: ResolvedRendersAnnotation | undefined = annotation;
  let depth = 0;

  while (depth < maxDepth) {
    // Type-based match check (handles union types)
    if (currentAnnotation) {
      if (annotationMatchesExpectedTypes(currentAnnotation, expectedTypeId, expectedTypeIds)) {
        return true;
      }
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
  renderMap: ResolvedRenderMap,
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
