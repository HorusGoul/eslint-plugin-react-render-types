import type { TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule.js";
import { parseRendersAnnotation } from "../utils/jsdoc-parser.js";

type MessageIds = never;

export default createRule<[], MessageIds>({
  name: "renders-uses-vars",
  meta: {
    type: "problem",
    docs: {
      description:
        "Mark components referenced in @renders as used to prevent no-unused-vars errors",
    },
    messages: {},
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Program(programNode: TSESTree.Program) {
        const comments = sourceCode.getAllComments();

        for (const comment of comments) {
          const text =
            comment.type === "Block" ? `/*${comment.value}*/` : comment.value;

          const annotation = parseRendersAnnotation(text);
          if (annotation) {
            // Mark all components in the union as used
            // Handle namespaced: "Menu.Item" -> mark "Menu"
            for (const componentName of annotation.componentNames) {
              const baseName = componentName.split(".")[0];
              sourceCode.markVariableAsUsed(baseName, programNode);
            }
          }
        }
      },
    };
  },
});
