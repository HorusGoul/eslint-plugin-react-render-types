import type { TSESTree } from "@typescript-eslint/utils";
import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation } from "../utils/jsdoc-parser.js";
import { isComponentName } from "../utils/component-utils.js";
import { createCrossFileResolver } from "../utils/cross-file-resolver.js";

type MessageIds =
  | "missingBraces"
  | "malformedAnnotation"
  | "lowercaseComponent"
  | "unresolvedComponent";

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
      unresolvedComponent:
        "@renders references '{{componentName}}' which is not defined or imported in this file.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    // Collect all known component names in this file
    const localComponents = new Set<string>();

    // Collect all imported identifiers
    const importedIdentifiers = new Set<string>();

    // Store comments with valid @renders annotations for later validation
    const commentsToValidate: Array<{
      comment: TSESTree.Comment;
      componentName: string;
    }> = [];

    // Try to get typed parser services for better import resolution
    let crossFileResolver: ReturnType<typeof createCrossFileResolver> | null = null;
    try {
      const parserServices = ESLintUtils.getParserServices(context, true);
      if (parserServices.program) {
        crossFileResolver = createCrossFileResolver({
          parserServices,
          sourceCode,
          filename: context.filename,
        });
      }
    } catch {
      // Typed linting not enabled - we'll still check local definitions and imports
    }

    /**
     * Check if a component name is available in the current file
     */
    function isComponentAvailable(name: string): boolean {
      // Check if defined locally
      if (localComponents.has(name)) {
        return true;
      }

      // Check if imported
      if (importedIdentifiers.has(name)) {
        return true;
      }

      // For namespaced components like Menu.Item, check if the base (Menu) is available
      if (name.includes(".")) {
        const baseName = name.split(".")[0];
        if (localComponents.has(baseName) || importedIdentifiers.has(baseName)) {
          return true;
        }
      }

      // If we have cross-file resolution, check if it's a known import with @renders
      if (crossFileResolver) {
        const augmentedMap = crossFileResolver.buildAugmentedRenderMap(new Map());
        if (augmentedMap.has(name)) {
          return true;
        }
      }

      return false;
    }

    /**
     * Validate a comment node for @renders issues
     */
    function validateCommentSyntax(comment: TSESTree.Comment): void {
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

      // If syntax is valid, queue for reference checking
      const annotation = parseRendersAnnotation(text);
      if (annotation) {
        commentsToValidate.push({
          comment,
          componentName: annotation.componentName,
        });
      }
    }

    /**
     * Validate that referenced components exist
     */
    function validateReferences(): void {
      for (const { comment, componentName } of commentsToValidate) {
        if (!isComponentAvailable(componentName)) {
          context.report({
            loc: comment.loc,
            messageId: "unresolvedComponent",
            data: {
              componentName,
            },
          });
        }
      }
    }

    /**
     * Collect component names from function declarations
     */
    function collectLocalComponent(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ): void {
      let name: string | null = null;

      if (node.type === "FunctionDeclaration" && node.id) {
        name = node.id.name;
      } else if (
        node.parent?.type === "VariableDeclarator" &&
        node.parent.id.type === "Identifier"
      ) {
        name = node.parent.id.name;
      }

      if (name && isComponentName(name)) {
        localComponents.add(name);
      }
    }

    return {
      // Collect imports
      ImportDeclaration(node) {
        // Default import: import Foo from '...'
        if (node.specifiers) {
          for (const spec of node.specifiers) {
            if (spec.type === "ImportDefaultSpecifier") {
              importedIdentifiers.add(spec.local.name);
            } else if (spec.type === "ImportSpecifier") {
              importedIdentifiers.add(spec.local.name);
            } else if (spec.type === "ImportNamespaceSpecifier") {
              importedIdentifiers.add(spec.local.name);
            }
          }
        }
      },

      // Collect local component definitions
      FunctionDeclaration: collectLocalComponent,
      FunctionExpression: collectLocalComponent,
      ArrowFunctionExpression: collectLocalComponent,

      // Also collect from class declarations (for class components)
      ClassDeclaration(node) {
        if (node.id && isComponentName(node.id.name)) {
          localComponents.add(node.id.name);
        }
      },

      // Collect from JSX elements (they reference existing components)
      JSXOpeningElement(node) {
        if (node.name.type === "JSXIdentifier" && isComponentName(node.name.name)) {
          // If it's used in JSX, it must be available - add to known components
          // This handles cases where a component is passed as a prop
          localComponents.add(node.name.name);
        } else if (node.name.type === "JSXMemberExpression") {
          // Handle Namespace.Component
          const parts: string[] = [];
          let current: TSESTree.JSXTagNameExpression = node.name;
          while (current.type === "JSXMemberExpression") {
            if (current.property.type === "JSXIdentifier") {
              parts.unshift(current.property.name);
            }
            current = current.object;
          }
          if (current.type === "JSXIdentifier") {
            parts.unshift(current.name);
          }
          if (parts.length > 0) {
            localComponents.add(parts.join("."));
          }
        }
      },

      // Validate syntax immediately when we see comments, queue reference checks
      "Program"() {
        const comments = sourceCode.getAllComments();
        for (const comment of comments) {
          if (comment.value.includes("@renders")) {
            validateCommentSyntax(comment);
          }
        }
      },

      // Validate references after we've collected all definitions and imports
      "Program:exit": validateReferences,
    };
  },
});
