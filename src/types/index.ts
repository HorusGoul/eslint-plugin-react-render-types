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
