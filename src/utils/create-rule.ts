import { ESLintUtils } from "@typescript-eslint/utils";

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/yourorg/eslint-plugin-react-render-types/blob/main/docs/rules/${name}.md`
);
