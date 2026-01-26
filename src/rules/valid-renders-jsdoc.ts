import type { TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation } from "../utils/jsdoc-parser.js";

type MessageIds =
  | "missingBraces"
  | "malformedAnnotation"
  | "lowercaseComponent";

/**
 * Regex to detect @renders without proper braces
 * Matches patterns like:
 * - @renders Header (missing braces)
 * - @renders? Header (missing braces with modifier)
 * - @renders* Header (missing braces with modifier)
 */
const RENDERS_WITHOUT_BRACES =
  /(?:^|[^a-zA-Z@])@renders(\?|\*)?\s+([A-Z][a-zA-Z0-9]*(?:\.[A-Z][a-zA-Z0-9]*)*)\s*(?:[^{]|$)/;

/**
 * Regex to detect @renders with malformed syntax
 * Matches patterns like:
 * - @renders {header} (lowercase)
 * - @renders {} (empty braces)
 * - @renders { } (whitespace only)
 * - @renders {123} (starts with number)
 */
const RENDERS_MALFORMED =
  /(?:^|[^a-zA-Z@])@renders(\?|\*)?\s*\{([^}]*)\}/;

/**
 * Check if a string looks like it was meant to be a @renders annotation
 * but is malformed
 */
function detectMalformedRenders(comment: string): {
  type: "missingBraces" | "malformedAnnotation" | "lowercaseComponent" | null;
  componentName?: string;
  suggestion?: string;
} {
  // First check if it's a valid annotation
  if (parseRendersAnnotation(comment)) {
    return { type: null };
  }

  // Check for missing braces: @renders Header instead of @renders {Header}
  const missingBracesMatch = comment.match(RENDERS_WITHOUT_BRACES);
  if (missingBracesMatch) {
    const [, modifier, componentName] = missingBracesMatch;
    return {
      type: "missingBraces",
      componentName,
      suggestion: `@renders${modifier ?? ""} {${componentName}}`,
    };
  }

  // Check for malformed content inside braces
  const malformedMatch = comment.match(RENDERS_MALFORMED);
  if (malformedMatch) {
    const [, , content] = malformedMatch;
    const trimmedContent = content.trim();

    // Empty braces
    if (!trimmedContent) {
      return {
        type: "malformedAnnotation",
        suggestion: "Provide a component name inside braces: @renders {ComponentName}",
      };
    }

    // Lowercase component name
    if (/^[a-z]/.test(trimmedContent)) {
      const pascalCase = trimmedContent.charAt(0).toUpperCase() + trimmedContent.slice(1);
      return {
        type: "lowercaseComponent",
        componentName: trimmedContent,
        suggestion: `Component names must be PascalCase. Did you mean @renders {${pascalCase}}?`,
      };
    }

    // Starts with number or invalid character
    if (!/^[A-Z]/.test(trimmedContent)) {
      return {
        type: "malformedAnnotation",
        suggestion: "Component name must start with an uppercase letter",
      };
    }
  }

  return { type: null };
}

export default createRule<[], MessageIds>({
  name: "valid-renders-jsdoc",
  meta: {
    type: "problem",
    docs: {
      description: "Validate @renders JSDoc annotation syntax and references",
    },
    messages: {
      missingBraces:
        "@renders annotation is missing braces. Use: {{suggestion}}",
      malformedAnnotation:
        "Malformed @renders annotation. {{suggestion}}",
      lowercaseComponent:
        "Component name '{{componentName}}' should be PascalCase. {{suggestion}}",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * Validate a comment node for @renders issues
     */
    function validateComment(comment: TSESTree.Comment): void {
      const text = comment.type === "Block" ? `/*${comment.value}*/` : comment.value;

      // Check for malformed syntax
      const malformed = detectMalformedRenders(text);

      if (malformed.type === "missingBraces") {
        context.report({
          loc: comment.loc,
          messageId: "missingBraces",
          data: {
            suggestion: malformed.suggestion!,
          },
        });
        return;
      }

      if (malformed.type === "lowercaseComponent") {
        context.report({
          loc: comment.loc,
          messageId: "lowercaseComponent",
          data: {
            componentName: malformed.componentName!,
            suggestion: malformed.suggestion!,
          },
        });
        return;
      }

      if (malformed.type === "malformedAnnotation") {
        context.report({
          loc: comment.loc,
          messageId: "malformedAnnotation",
          data: {
            suggestion: malformed.suggestion!,
          },
        });
        return;
      }

      // Note: We don't check for unresolved component references because:
      // 1. Components might be defined in other files and passed as props
      // 2. Interface annotations define constraints, not references
      // 3. False positives would be more harmful than missing this check
      // The valid-render-return and valid-render-prop rules handle actual usage validation.
    }

    return {
      // Validate all comments at the end of file processing
      "Program:exit"() {
        const comments = sourceCode.getAllComments();
        for (const comment of comments) {
          // Only check comments that might contain @renders
          if (comment.value.includes("@renders")) {
            validateComment(comment);
          }
        }
      },
    };
  },
});
