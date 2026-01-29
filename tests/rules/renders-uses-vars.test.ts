import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../../src/rules/renders-uses-vars.js";

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

// Note: This rule only marks variables as used - it doesn't report any errors itself.
// The actual test is that no-unused-vars won't flag these imports.
// We test that the rule runs without errors on valid code.

ruleTester.run("renders-uses-vars", rule, {
  valid: [
    // Regular import - component in @renders is marked as used
    {
      name: "marks regular imported component as used",
      code: `
        import { Header } from './Header';
        /** @renders {Header} */
        function MyHeader() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Type-only import: import type { X }
    {
      name: "marks type-only import as used (import type syntax)",
      code: `
        import type { Header } from './Header';
        /** @renders {Header} */
        function MyHeader() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Inline type import: import { type X }
    {
      name: "marks inline type import as used (import { type X } syntax)",
      code: `
        import { type Header } from './Header';
        /** @renders {Header} */
        function MyHeader() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Mixed imports: regular and type
    {
      name: "handles mixed regular and type imports",
      code: `
        import { Wrapper, type Header } from './components';
        /** @renders {Header} */
        function MyHeader() {
          return <Wrapper />;
        }
      `,
      filename: "test.tsx",
    },
    // Namespaced component - base is marked as used
    {
      name: "marks namespaced component base as used",
      code: `
        import { Menu } from './Menu';
        /** @renders {Menu.Item} */
        function MyMenuItem() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Multiple @renders in same file
    {
      name: "handles multiple @renders annotations",
      code: `
        import { Header } from './Header';
        import { Footer } from './Footer';
        /** @renders {Header} */
        function A() { return <div />; }
        /** @renders {Footer} */
        function B() { return <div />; }
      `,
      filename: "test.tsx",
    },
    // @renders in interface prop comment
    {
      name: "marks component in interface prop annotation",
      code: `
        import { Tab } from './Tab';
        interface Props {
          /** @renders {Tab} */
          children: React.ReactNode;
        }
        function Tabs({ children }: Props) {
          return <div>{children}</div>;
        }
      `,
      filename: "test.tsx",
    },
    // @renders? optional modifier
    {
      name: "handles optional @renders? modifier",
      code: `
        import { Header } from './Header';
        /** @renders? {Header} */
        function MaybeHeader() {
          return null;
        }
      `,
      filename: "test.tsx",
    },
    // @renders* many modifier
    {
      name: "handles many @renders* modifier",
      code: `
        import { MenuItem } from './MenuItem';
        /** @renders* {MenuItem} */
        function MenuItems() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // No @renders annotation - still valid (rule just does nothing)
    {
      name: "handles code without @renders",
      code: `
        function PlainComponent() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Line comment with @renders
    {
      name: "handles line comments with @renders",
      code: `
        import { Header } from './Header';
        // @renders {Header}
        function MyHeader() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Union type - marks all components as used
    {
      name: "marks all union type components as used",
      code: `
        import { Header } from './Header';
        import { Footer } from './Footer';
        /** @renders {Header | Footer} */
        function FlexComponent() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Union type with three components
    {
      name: "marks all three union components as used",
      code: `
        import { Header } from './Header';
        import { Sidebar } from './Sidebar';
        import { Footer } from './Footer';
        /** @renders {Header | Sidebar | Footer} */
        function FlexComponent() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Union type with namespaced components
    {
      name: "marks namespaced union components as used",
      code: `
        import { Menu } from './Menu';
        import { List } from './List';
        /** @renders {Menu.Item | List.Item} */
        function GenericItem() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Large union type with five components
    {
      name: "marks all five union components as used",
      code: `
        import { Header } from './Header';
        import { Sidebar } from './Sidebar';
        import { Content } from './Content';
        import { Footer } from './Footer';
        import { Navigation } from './Navigation';
        /** @renders {Header | Sidebar | Content | Footer | Navigation} */
        function LayoutSection() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
    // Large union type with seven components
    {
      name: "marks all seven union components as used",
      code: `
        import { A } from './A';
        import { B } from './B';
        import { C } from './C';
        import { D } from './D';
        import { E } from './E';
        import { F } from './F';
        import { G } from './G';
        /** @renders {A | B | C | D | E | F | G} */
        function AlphaComponent() {
          return <div />;
        }
      `,
      filename: "test.tsx",
    },
  ],
  // This rule never reports errors - it only marks variables as used
  invalid: [],
});
