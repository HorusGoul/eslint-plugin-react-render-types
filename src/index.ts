import type { TSESLint } from "@typescript-eslint/utils";
import { rules } from "./rules/index.js";

type RuleKey = keyof typeof rules;

const plugin = {
  meta: {
    name: "eslint-plugin-react-render-types",
    version: "0.1.0",
  },
  rules,
  configs: {} as Record<string, TSESLint.FlatConfig.Config>,
};

// Create recommended config
Object.assign(plugin.configs, {
  recommended: {
    plugins: {
      "react-render-types": plugin,
    },
    rules: {
      "react-render-types/valid-render-return": "error",
      "react-render-types/valid-render-prop": "error",
      "react-render-types/valid-renders-jsdoc": "warn",
    } satisfies Record<`react-render-types/${RuleKey}`, TSESLint.Linter.RuleLevel>,
  },
});

export default plugin;

// Named exports for convenience
export { rules };
