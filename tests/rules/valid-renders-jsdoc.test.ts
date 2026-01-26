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

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
      projectService: {
        allowDefaultProject: ["*.tsx"],
      },
    },
  },
});

ruleTester.run("valid-renders-jsdoc", rule, {
  valid: [
    // Correct syntax with braces
    {
      name: "correct @renders syntax",
      code: `
        /** @renders {Header} */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
    },
    // Correct syntax with optional modifier
    {
      name: "correct @renders? syntax",
      code: `
        /** @renders? {Header} */
        function MaybeHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
    },
    // Correct syntax with many modifier
    {
      name: "correct @renders* syntax",
      code: `
        /** @renders* {MenuItem} */
        function MenuItems() {
          return <MenuItem />;
        }
      `,
      filename: "test.tsx",
    },
    // Namespaced component
    {
      name: "correct namespaced component syntax",
      code: `
        /** @renders {Menu.Item} */
        function MyMenuItem() {
          return <Menu.Item />;
        }
      `,
      filename: "test.tsx",
    },
    // No @renders annotation - should be ignored
    {
      name: "no annotation should be ignored",
      code: `
        /** Just a regular comment */
        function MyComponent() {
          return <div>Hello</div>;
        }
      `,
      filename: "test.tsx",
    },
    // @renders in prop annotation (valid)
    {
      name: "@renders in interface prop",
      code: `
        interface Props {
          /** @renders {Header} */
          header: React.ReactNode;
        }
        function Layout({ header }: Props) {
          return <div>{header}</div>;
        }
      `,
      filename: "test.tsx",
    },
  ],
  invalid: [
    // Missing braces
    {
      name: "missing braces - @renders Header",
      code: `
        /** @renders Header */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingBraces",
          data: {
            suggestion: "@renders {Header}",
          },
        },
      ],
    },
    // Missing braces with optional modifier
    {
      name: "missing braces - @renders? Header",
      code: `
        /** @renders? Header */
        function MaybeHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingBraces",
          data: {
            suggestion: "@renders? {Header}",
          },
        },
      ],
    },
    // Missing braces with many modifier
    {
      name: "missing braces - @renders* MenuItem",
      code: `
        /** @renders* MenuItem */
        function MenuItems() {
          return <MenuItem />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingBraces",
          data: {
            suggestion: "@renders* {MenuItem}",
          },
        },
      ],
    },
    // Lowercase component name
    {
      name: "lowercase component name",
      code: `
        /** @renders {header} */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "lowercaseComponent",
          data: {
            componentName: "header",
            suggestion: "Component names must be PascalCase. Did you mean @renders {Header}?",
          },
        },
      ],
    },
    // Empty braces
    {
      name: "empty braces",
      code: `
        /** @renders {} */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "malformedAnnotation",
          data: {
            suggestion: "Provide a component name inside braces: @renders {ComponentName}",
          },
        },
      ],
    },
    // Whitespace only in braces
    {
      name: "whitespace only in braces",
      code: `
        /** @renders {   } */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "malformedAnnotation",
          data: {
            suggestion: "Provide a component name inside braces: @renders {ComponentName}",
          },
        },
      ],
    },
    // Number starting component name
    {
      name: "component name starting with number",
      code: `
        /** @renders {123Header} */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "malformedAnnotation",
          data: {
            suggestion: "Component name must start with an uppercase letter",
          },
        },
      ],
    },
    // Multiple errors in same file
    {
      name: "multiple malformed annotations",
      code: `
        /** @renders Header */
        function MyHeader() {
          return <Header />;
        }

        /** @renders {footer} */
        function MyFooter() {
          return <Footer />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingBraces",
        },
        {
          messageId: "lowercaseComponent",
        },
      ],
    },
  ],
});
