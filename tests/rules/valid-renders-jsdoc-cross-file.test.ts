import path from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../../src/rules/valid-renders-jsdoc.js";

// Configure rule tester to use vitest
RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.itSkip = vitest.it.skip;
RuleTester.describe = vitest.describe;
RuleTester.describeSkip = vitest.describe.skip;

const fixturesDir = path.resolve(__dirname, "../fixtures/cross-file-props");

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
      projectService: {
        allowDefaultProject: ["consumer.tsx"],
        defaultProject: "tsconfig.json",
      },
      tsconfigRootDir: fixturesDir,
    },
  },
});

ruleTester.run("valid-renders-jsdoc (namespace imports)", rule, {
  valid: [
    // Namespace import with valid member component
    {
      name: "valid namespaced component via namespace import",
      code: `
        import * as Components from "./namespace-barrel";

        interface MyProps {
          /** @renders {Components.NavItem} */
          children: React.ReactNode;
        }

        function MyComponent({ children }: MyProps) {
          return <div>{children}</div>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
  ],
  invalid: [
    // Namespace import with typo in member component name
    {
      name: "unresolved member in namespace import",
      code: `
        import * as Components from "./namespace-barrel";

        interface MyProps {
          /** @renders {Components.NavItme} */
          children: React.ReactNode;
        }

        function MyComponent({ children }: MyProps) {
          return <div>{children}</div>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "unresolvedComponent",
          data: {
            componentName: "Components.NavItme",
          },
        },
      ],
    },
  ],
});
