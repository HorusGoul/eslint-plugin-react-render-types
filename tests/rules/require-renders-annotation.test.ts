import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../../src/rules/require-renders-annotation.js";

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

ruleTester.run("require-renders-annotation", rule, {
  valid: [
    // Component with @renders annotation
    {
      name: "function declaration with @renders",
      code: `
        /** @renders {Header} */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
    },
    // Arrow function with @renders
    {
      name: "arrow function with @renders",
      code: `
        /** @renders {Header} */
        const MyHeader = () => <Header />;
      `,
      filename: "test.tsx",
    },
    // Arrow function with block body and @renders
    {
      name: "arrow function with block body and @renders",
      code: `
        /** @renders {Header} */
        const MyHeader = () => {
          return <Header />;
        };
      `,
      filename: "test.tsx",
    },
    // Function expression with @renders
    {
      name: "function expression with @renders",
      code: `
        /** @renders {Footer} */
        const MyFooter = function() {
          return <Footer />;
        };
      `,
      filename: "test.tsx",
    },
    // Optional @renders?
    {
      name: "optional @renders annotation",
      code: `
        /** @renders? {Header} */
        function MaybeHeader({ show }: { show: boolean }) {
          if (!show) return null;
          return <Header />;
        }
      `,
      filename: "test.tsx",
    },
    // Many @renders*
    {
      name: "many @renders annotation",
      code: `
        /** @renders* {MenuItem} */
        function MenuItems() {
          return <MenuItem />;
        }
      `,
      filename: "test.tsx",
    },
    // Non-component functions (lowercase name)
    {
      name: "lowercase function name is ignored",
      code: `
        function helperFunction() {
          return <div>Helper</div>;
        }
      `,
      filename: "test.tsx",
    },
    // Non-component functions (no JSX return)
    {
      name: "function without JSX return is ignored",
      code: `
        function Calculator() {
          return 42;
        }
      `,
      filename: "test.tsx",
    },
    // Hook functions (use prefix)
    {
      name: "hooks are ignored",
      code: `
        function useMyHook() {
          return { value: 42 };
        }
      `,
      filename: "test.tsx",
    },
    // Component with JSDoc but @renders on separate line
    {
      name: "@renders in multi-line JSDoc",
      code: `
        /**
         * A custom header component.
         * @renders {Header}
         */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
    },
    // Exported function declaration with @renders
    {
      name: "exported function declaration with @renders",
      code: `
        /** @renders {Header} */
        export function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
    },
    // Exported arrow function with @renders
    {
      name: "exported arrow function with @renders",
      code: `
        /** @renders {Header} */
        export const MyHeader = () => <Header />;
      `,
      filename: "test.tsx",
    },
    // Exported arrow function with block body and @renders
    {
      name: "exported arrow function with block body and @renders",
      code: `
        /** @renders {Header} */
        export const MyHeader = () => {
          return <Header />;
        };
      `,
      filename: "test.tsx",
    },
    // Exported function expression with @renders
    {
      name: "exported function expression with @renders",
      code: `
        /** @renders {Footer} */
        export const MyFooter = function() {
          return <Footer />;
        };
      `,
      filename: "test.tsx",
    },
    // Export default function declaration with @renders
    {
      name: "export default function declaration with @renders",
      code: `
        /** @renders {Header} */
        export default function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
    },
  ],
  invalid: [
    // Missing annotation on function declaration
    {
      name: "function declaration missing @renders",
      code: `
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MyHeader" },
        },
      ],
    },
    // Missing annotation on arrow function
    {
      name: "arrow function missing @renders",
      code: `
        const MyHeader = () => <Header />;
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MyHeader" },
        },
      ],
    },
    // Missing annotation on arrow function with block body
    {
      name: "arrow function with block body missing @renders",
      code: `
        const MyHeader = () => {
          return <Header />;
        };
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MyHeader" },
        },
      ],
    },
    // Missing annotation on function expression
    {
      name: "function expression missing @renders",
      code: `
        const MyFooter = function() {
          return <Footer />;
        };
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MyFooter" },
        },
      ],
    },
    // Component with conditional JSX return
    {
      name: "conditional JSX return missing @renders",
      code: `
        function ConditionalComponent({ show }: { show: boolean }) {
          return show ? <Header /> : <Footer />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "ConditionalComponent" },
        },
      ],
    },
    // Component with logical expression JSX return
    {
      name: "logical expression JSX return missing @renders",
      code: `
        function MaybeHeader({ show }: { show: boolean }) {
          return show && <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MaybeHeader" },
        },
      ],
    },
    // Component with fragment return
    {
      name: "fragment return missing @renders",
      code: `
        function MultipleItems() {
          return (
            <>
              <Header />
              <Footer />
            </>
          );
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MultipleItems" },
        },
      ],
    },
    // Component with other JSDoc but no @renders
    {
      name: "component with other JSDoc but no @renders",
      code: `
        /**
         * A custom header component.
         * @param props - The component props
         */
        function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MyHeader" },
        },
      ],
    },
    // Exported function declaration missing @renders
    {
      name: "exported function declaration missing @renders",
      code: `
        export function MyHeader() {
          return <Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MyHeader" },
        },
      ],
    },
    // Exported arrow function missing @renders
    {
      name: "exported arrow function missing @renders",
      code: `
        export const MyHeader = () => <Header />;
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "missingRendersAnnotation",
          data: { componentName: "MyHeader" },
        },
      ],
    },
  ],
});
