import path from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../../src/rules/valid-render-return.js";
import { clearAnnotationCache } from "../../src/utils/cross-file-resolver.js";

// Configure rule tester to use vitest
RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.itSkip = vitest.it.skip;
RuleTester.describe = vitest.describe;
RuleTester.describeSkip = vitest.describe.skip;

const fixturesDir = path.resolve(__dirname, "../fixtures/cross-file-transparent");

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

vitest.beforeEach(() => {
  clearAnnotationCache();
});

ruleTester.run("valid-render-return (cross-file transparent)", rule, {
  valid: [
    // Imported @transparent wrapper around correct component
    {
      name: "cross-file: imported @transparent wrapper around correct component",
      code: `
        import { TransparentWrapper } from "./TransparentWrapper";
        import { Header } from "./Header";

        /** @renders {Header} */
        function MyComponent() {
          return <TransparentWrapper><Header /></TransparentWrapper>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Imported @transparent {off, children} with correct components in both props
    {
      name: "cross-file: imported @transparent with named props, correct components",
      code: `
        import { NamedPropWrapper } from "./NamedPropWrapper";
        import { Header } from "./Header";

        /** @renders {Header} */
        function MyComponent() {
          return <NamedPropWrapper off={<Header />}><Header /></NamedPropWrapper>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Non-transparent import used directly (matches @renders because it IS the component)
    {
      name: "cross-file: non-transparent wrapper returned directly matches @renders",
      code: `
        import { NonTransparentWrapper } from "./NonTransparentWrapper";

        /** @renders {NonTransparentWrapper} */
        function MyComponent() {
          return <NonTransparentWrapper><div /></NonTransparentWrapper>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
  ],
  invalid: [
    // Imported @transparent wrapper with wrong child
    {
      name: "cross-file: imported @transparent wrapper with wrong child",
      code: `
        import { TransparentWrapper } from "./TransparentWrapper";
        import { Footer } from "./Footer";

        /** @renders {Header} */
        function MyComponent() {
          return <TransparentWrapper><Footer /></TransparentWrapper>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
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
    // Imported @transparent {off, children} with wrong component in named prop
    {
      name: "cross-file: imported @transparent named prop with wrong component in off",
      code: `
        import { NamedPropWrapper } from "./NamedPropWrapper";
        import { Header } from "./Header";
        import { Footer } from "./Footer";

        /** @renders {Header} */
        function MyComponent() {
          return <NamedPropWrapper off={<Footer />}><Header /></NamedPropWrapper>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
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
    // Non-transparent wrapper is NOT looked through (returns wrapper name, not child)
    {
      name: "cross-file: non-transparent wrapper is not looked through",
      code: `
        import { NonTransparentWrapper } from "./NonTransparentWrapper";
        import { Header } from "./Header";

        /** @renders {Header} */
        function MyComponent() {
          return <NonTransparentWrapper><Header /></NonTransparentWrapper>;
        }
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "NonTransparentWrapper",
          },
        },
      ],
    },
  ],
});
