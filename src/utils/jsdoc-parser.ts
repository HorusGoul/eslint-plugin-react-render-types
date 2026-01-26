import type { RendersAnnotation } from "../types/index.js";

/**
 * Regex to match @renders annotation
 * Groups:
 * 1. modifier (? or * or undefined)
 * 2. component name (including namespaced like Menu.Item)
 *
 * Pattern explanation:
 * - (?:^|[^a-zA-Z@]) - start of string or non-letter/non-@ (prevents matching pre@renders)
 * - @renders - literal @renders
 * - (\?|\*)? - optional modifier (? or *)
 * - \s* - optional whitespace
 * - \{ - opening brace
 * - \s* - optional whitespace
 * - ([A-Z][a-zA-Z0-9]*(?:\.[A-Z][a-zA-Z0-9]*)*) - component name (PascalCase, optionally namespaced)
 * - \s* - optional whitespace
 * - \} - closing brace
 */
const RENDERS_REGEX =
  /(?:^|[^a-zA-Z@])@renders(\?|\*)?\s*\{\s*([A-Z][a-zA-Z0-9]*(?:\.[A-Z][a-zA-Z0-9]*)*)\s*\}/;

/**
 * Parse @renders annotation from JSDoc comment text
 * Handles: @renders {Component}, @renders? {Component}, @renders* {Component}
 */
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

  const [, modifierChar, componentName] = match;

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

  // Reconstruct the raw annotation string
  const raw = `@renders${modifierChar ?? ""} {${componentName}}`;

  return {
    componentName,
    modifier,
    raw,
  };
}
