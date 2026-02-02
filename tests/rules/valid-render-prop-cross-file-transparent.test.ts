import path from "node:path";
import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../../src/rules/valid-render-prop.js";
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

ruleTester.run("valid-render-prop (cross-file transparent)", rule, {
  valid: [
    // Imported @transparent wrapper in children position with correct component
    {
      name: "cross-file: imported @transparent wrapper in children with correct component",
      code: `
        import { Header } from "./Header";
        import { TransparentWrapper } from "./TransparentWrapper";

        interface LayoutProps {
          /** @renders {Header} */
          children: React.ReactNode;
        }

        function Layout({ children }: LayoutProps) {
          return <div>{children}</div>;
        }

        <Layout>
          <TransparentWrapper>
            <Header />
          </TransparentWrapper>
        </Layout>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Imported @transparent wrapper in prop value with correct component
    {
      name: "cross-file: imported @transparent wrapper in prop with correct component",
      code: `
        import { Header } from "./Header";
        import { TransparentWrapper } from "./TransparentWrapper";

        interface LayoutProps {
          /** @renders {Header} */
          header: React.ReactNode;
          children: React.ReactNode;
        }

        function Layout({ header, children }: LayoutProps) {
          return <div>{header}{children}</div>;
        }

        <Layout header={<TransparentWrapper><Header /></TransparentWrapper>}>
          <div />
        </Layout>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
  ],
  invalid: [
    // Imported @transparent wrapper in children with wrong component
    {
      name: "cross-file: imported @transparent wrapper in children with wrong component",
      code: `
        import { Header } from "./Header";
        import { Footer } from "./Footer";
        import { TransparentWrapper } from "./TransparentWrapper";

        interface LayoutProps {
          /** @renders {Header} */
          children: React.ReactNode;
        }

        function Layout({ children }: LayoutProps) {
          return <div>{children}</div>;
        }

        <Layout>
          <TransparentWrapper>
            <Footer />
          </TransparentWrapper>
        </Layout>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "Header",
            actual: "Footer",
          },
        },
      ],
    },
    // Non-transparent wrapper is not looked through in children
    {
      name: "cross-file: non-transparent wrapper is not looked through in children",
      code: `
        import { Header } from "./Header";
        import { NonTransparentWrapper } from "./NonTransparentWrapper";

        interface LayoutProps {
          /** @renders {Header} */
          children: React.ReactNode;
        }

        function Layout({ children }: LayoutProps) {
          return <div>{children}</div>;
        }

        <Layout>
          <NonTransparentWrapper>
            <Header />
          </NonTransparentWrapper>
        </Layout>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "Header",
            actual: "NonTransparentWrapper",
          },
        },
      ],
    },
  ],
});
