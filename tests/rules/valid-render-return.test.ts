import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../../src/rules/valid-render-return.js";

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

// Helper to add component declarations to test code
const withComponents = (code: string, components: string[] = []) => {
  const declarations = components
    .map((c) => `declare const ${c}: React.FC<any>;`)
    .join("\n");
  return declarations ? `${declarations}\n${code}` : code;
};

ruleTester.run("valid-render-return", rule, {
  valid: [
    // Direct return of annotated component
    {
      name: "direct return of annotated component",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyComponent() {
          return <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Arrow function returning correct component
    {
      name: "arrow function returning correct component",
      code: withComponents(
        `
        /** @renders {Header} */
        const MyHeader = () => <Header />;
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Arrow function with block body
    {
      name: "arrow function with block body",
      code: withComponents(
        `
        /** @renders {Header} */
        const MyHeader = () => {
          return <Header />;
        };
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // No annotation - should be ignored
    {
      name: "no annotation should be ignored",
      code: `
        function MyComponent() {
          return <div>Hello</div>;
        }
      `,
      filename: "test.tsx",
    },
    // Function expression with annotation
    {
      name: "function expression with annotation",
      code: withComponents(
        `
        /** @renders {Footer} */
        const MyFooter = function() {
          return <Footer />;
        };
      `,
        ["Footer"]
      ),
      filename: "test.tsx",
    },
    // Namespaced component
    {
      name: "namespaced component",
      code: `
        declare const Menu: { Item: React.FC<any> };
        /** @renders {Menu.Item} */
        function MyMenuItem() {
          return <Menu.Item />;
        }
      `,
      filename: "test.tsx",
    },
    // Component with props
    {
      name: "component with props",
      code: withComponents(
        `
        /** @renders {Header} */
        function CustomHeader({ title }: { title: string }) {
          return <Header title={title} />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Chained rendering - single level
    {
      name: "chained rendering - single level",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyHeader() {
          return <Header />;
        }

        /** @renders {Header} */
        function CustomHeader() {
          return <MyHeader />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Chained rendering - two levels
    {
      name: "chained rendering - two levels",
      code: withComponents(
        `
        /** @renders {Header} */
        function BaseHeader() {
          return <Header />;
        }

        /** @renders {BaseHeader} */
        function MyHeader() {
          return <BaseHeader />;
        }

        /** @renders {Header} */
        function CustomHeader() {
          return <MyHeader />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // @renders? - optional: returning null is valid
    {
      name: "optional renders with null return",
      code: withComponents(
        `
        /** @renders? {Header} */
        function MaybeHeader({ show }: { show: boolean }) {
          if (!show) return null;
          return <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // @renders? - optional: returning component is valid
    {
      name: "optional renders with component return",
      code: withComponents(
        `
        /** @renders? {Header} */
        function MaybeHeader() {
          return <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // @renders? - optional: returning undefined is valid
    {
      name: "optional renders with undefined return",
      code: withComponents(
        `
        /** @renders? {Header} */
        function MaybeHeader({ show }: { show: boolean }) {
          if (!show) return undefined;
          return <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // @renders* - many: returning array is valid
    {
      name: "many renders with array",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function MenuItems({ items }: { items: string[] }) {
          return <>{items.map(item => <MenuItem key={item} />)}</>;
        }
      `,
        ["MenuItem"]
      ),
      filename: "test.tsx",
    },
    // @renders* - many: returning fragment with multiple elements is valid
    {
      name: "many renders with fragment",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function TwoItems() {
          return (
            <>
              <MenuItem />
              <MenuItem />
            </>
          );
        }
      `,
        ["MenuItem"]
      ),
      filename: "test.tsx",
    },
    // @renders* - many: returning single element is valid
    {
      name: "many renders with single element",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function SingleItem() {
          return <MenuItem />;
        }
      `,
        ["MenuItem"]
      ),
      filename: "test.tsx",
    },
    // @renders* - many: returning null is valid (zero elements)
    {
      name: "many renders with null",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function NoItems() {
          return null;
        }
      `,
        ["MenuItem"]
      ),
      filename: "test.tsx",
    },
  ],
  invalid: [
    // Wrong component returned
    {
      name: "wrong component returned",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyComponent() {
          return <Footer />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "Footer",
          },
        },
      ],
    },
    // Returns primitive JSX when component expected
    {
      name: "returns primitive JSX when component expected",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyComponent() {
          return <div>Not a Header</div>;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "div",
          },
        },
      ],
    },
    // Arrow function returning wrong component
    {
      name: "arrow function returning wrong component",
      code: withComponents(
        `
        /** @renders {Header} */
        const MyHeader = () => <Footer />;
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "Footer",
          },
        },
      ],
    },
    // Wrong namespaced component
    {
      name: "wrong namespaced component",
      code: `
        declare const Menu: { Item: React.FC<any>; Header: React.FC<any> };
        /** @renders {Menu.Item} */
        function MyMenuItem() {
          return <Menu.Header />;
        }
      `,
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Menu.Item",
            actual: "Menu.Header",
          },
        },
      ],
    },
    // Chained component doesn't render expected type
    {
      name: "chained component does not render expected type",
      code: withComponents(
        `
        /** @renders {Footer} */
        function MyFooter() {
          return <Footer />;
        }

        /** @renders {Header} */
        function MyComponent() {
          return <MyFooter />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "MyFooter",
          },
        },
      ],
    },
    // @renders? - optional: returning wrong component is invalid
    {
      name: "optional renders with wrong component",
      code: withComponents(
        `
        /** @renders? {Header} */
        function MaybeHeader() {
          return <Footer />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "Footer",
          },
        },
      ],
    },
    // @renders* - many: returning wrong component type is invalid
    {
      name: "many renders with wrong component",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function MenuItems() {
          return <Footer />;
        }
      `,
        ["MenuItem", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "MenuItem",
            actual: "Footer",
          },
        },
      ],
    },
    // Required @renders returning null is invalid
    {
      name: "required renders returning null",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyHeader() {
          return null;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "null",
          },
        },
      ],
    },
    // Multiple return paths with one invalid
    {
      name: "multiple return paths with one invalid",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyHeader({ variant }: { variant: string }) {
          if (variant === "special") {
            return <Header />;
          }
          return <Footer />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "Footer",
          },
        },
      ],
    },
  ],
});
