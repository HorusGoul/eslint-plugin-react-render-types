import type { RendersAnnotation } from "../types/index.js";

/**
 * Regex to match @renders annotation with optional union types
 * Groups:
 * 1. modifier (? or * or undefined)
 * 2. full type expression (component names with optional union syntax)
 *
 * Pattern explanation:
 * - (?:^|[^a-zA-Z@]) - start of string or non-letter/non-@ (prevents matching pre@renders)
 * - @renders - literal @renders
 * - (\?|\*)? - optional modifier (? or *)
 * - \s* - optional whitespace
 * - \{ - opening brace
 * - \s* - optional whitespace
 * - ([^}]+) - capture everything inside braces (component names, pipes, whitespace)
 * - \s* - optional whitespace
 * - \} - closing brace
 */
const RENDERS_REGEX = /(?:^|[^a-zA-Z@])@renders(\?|\*)?\s*\{\s*([^}]+)\s*\}/;

/**
 * Regex to validate a single component name (PascalCase, optionally namespaced)
 */
const COMPONENT_NAME_REGEX = /^[A-Z][a-zA-Z0-9]*(?:\.[A-Z][a-zA-Z0-9]*)*$/;

/**
 * Parse union type expression into component names.
 * Examples:
 * - "Header" -> ["Header"]
 * - "Header | Footer" -> ["Header", "Footer"]
 * - "Header | Menu.Item | Footer" -> ["Header", "Menu.Item", "Footer"]
 *
 * Returns null if any component name is invalid.
 */
function parseUnionType(typeExpression: string): string[] | null {
  const parts = typeExpression.split("|").map((part) => part.trim());

  // Validate all parts are valid component names
  for (const part of parts) {
    if (!COMPONENT_NAME_REGEX.test(part)) {
      return null;
    }
  }

  return parts;
}

/**
 * Parse @renders annotation from JSDoc comment text
 * Handles:
 * - @renders {Component}
 * - @renders? {Component}
 * - @renders* {Component}
 * - @renders {Header | Footer} (union types)
 */
/**
 * Regex to match @transparent annotation
 * Matches @transparent as a standalone tag (not part of another word)
 */
const TRANSPARENT_REGEX = /(?:^|[^a-zA-Z@])@transparent\b/;

/**
 * Check if a comment contains the @transparent annotation
 */
export function parseTransparentAnnotation(comment: string): boolean {
  if (!comment) {
    return false;
  }
  return TRANSPARENT_REGEX.test(comment);
}

export function parseRendersAnnotation(
  comment: string
): RendersAnnotation | null {
  if (!comment) {
    return null;
  }

  const match = comment.match(RENDERS_REGEX);
  if (!match) {
    return null;
  }

  const [, modifierChar, typeExpression] = match;

  // Parse the type expression (may be a union)
  const componentNames = parseUnionType(typeExpression);
  if (!componentNames || componentNames.length === 0) {
    return null;
  }

  let modifier: RendersAnnotation["modifier"];
  switch (modifierChar) {
    case "?":
      modifier = "optional";
      break;
    case "*":
      modifier = "many";
      break;
    default:
      modifier = "required";
  }

  // Format the raw annotation string
  const formattedType =
    componentNames.length === 1
      ? componentNames[0]
      : componentNames.join(" | ");
  const raw = `@renders${modifierChar ?? ""} {${formattedType}}`;

  return {
    componentName: componentNames[0], // First component for backwards compatibility
    componentNames,
    modifier,
    raw,
  };
}
