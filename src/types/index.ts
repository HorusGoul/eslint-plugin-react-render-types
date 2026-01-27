/**
 * Represents a parsed @renders annotation from JSDoc
 */
export interface RendersAnnotation {
  /** The component name to render (e.g., "Header", "Menu.Item") */
  componentName: string;
  /** The modifier type */
  modifier: "required" | "optional" | "many";
  /** The raw annotation text */
  raw: string;
}

/**
 * Unique identifier for a component across files.
 * Format: "filePath:symbolName" or just "symbolName" for local-only matching
 */
export type ComponentTypeId = string;

/**
 * Extended annotation that includes type identity information
 * for cross-file type-safe matching.
 */
export interface ResolvedRendersAnnotation extends RendersAnnotation {
  /** Unique type identifier for the target component (filePath:symbolName) */
  targetTypeId?: ComponentTypeId;
}

/**
 * Map of component names to their resolved annotations with type information
 */
export type ResolvedRenderMap = Map<string, ResolvedRendersAnnotation>;

/**
 * Component with its type identity
 */
export interface ComponentTypeInfo {
  /** Local name (as used in the file) */
  localName: string;
  /** Unique type identifier (filePath:symbolName) */
  typeId: ComponentTypeId;
  /** The @renders annotation if present */
  annotation?: ResolvedRendersAnnotation;
}
