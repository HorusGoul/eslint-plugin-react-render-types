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

vitest.beforeEach(() => {
  clearAnnotationCache();
});

ruleTester.run("valid-render-prop (cross-file)", rule, {
  valid: [
    // Annotated component chains to expected type across files
    {
      name: "cross-file: annotated component in @renders* children",
      code: `
        import { Sidebar } from "./Sidebar";
        import { NavLink } from "./NavLink";

        <Sidebar>
          <NavLink label="Home" />
        </Sidebar>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Union @renders* named prop accepts both annotated chain and direct match
    {
      name: "cross-file: union @renders* named prop accepts annotated and unannotated",
      code: `
        import { DashboardLayout } from "./DashboardLayout";
        import { NavLink } from "./NavLink";
        import { NavSection } from "./NavSection";

        <DashboardLayout navigation={<><NavLink label="Home" /><NavSection title="Reports" /></>}>
          <div />
        </DashboardLayout>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Component with @renders* used as child of @renders* parent (cross-file)
    {
      name: "cross-file: component with @renders* in @renders* children",
      code: `
        import { Sidebar } from "./Sidebar";
        import { NavItems } from "./NavItems";

        <Sidebar>
          <NavItems links={["Home", "About"]} />
        </Sidebar>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Component with @renders* {NavItem} used as child of @renders* {NavItem | NavGroup} parent
    {
      name: "cross-file: @renders* component in union @renders* children",
      code: `
        import { Nav } from "./Nav";
        import { NavItems } from "./NavItems";
        import { NavGroup } from "./NavGroup";

        <Nav>
          <NavItems links={["Home", "About"]} />
          <NavGroup title="Admin" />
        </Nav>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Component with @renders* via barrel import
    {
      name: "cross-file: @renders* component via barrel import in union children",
      code: `
        import { Nav, NavItems, NavGroup } from "./barrel";

        <Nav>
          <NavItems links={["Home", "About"]} />
          <NavGroup title="Admin" />
        </Nav>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
    // Component with @renders* via deep barrel (2-level re-export)
    {
      name: "cross-file: @renders* component via deep barrel import",
      code: `
        import { Nav, NavItems, NavGroup } from "./deep-barrel";

        <Nav>
          <NavItems links={["Home", "About"]} />
          <NavGroup title="Admin" />
        </Nav>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
    },
  ],
  invalid: [
    // Unannotated component in cross-file @renders* children
    {
      name: "cross-file: unannotated component in @renders* children",
      code: `
        import { Sidebar } from "./Sidebar";
        import { NavSection } from "./NavSection";

        <Sidebar>
          <NavSection title="Reports" />
        </Sidebar>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "NavItem",
            actual: "NavSection",
          },
        },
      ],
    },
    // Mix of valid and invalid among cross-file @renders* children
    {
      name: "cross-file: unannotated component among valid children",
      code: `
        import { Sidebar } from "./Sidebar";
        import { NavLink } from "./NavLink";
        import { NavSection } from "./NavSection";

        <Sidebar>
          <NavLink label="Home" />
          <NavSection title="Reports" />
        </Sidebar>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "NavItem",
            actual: "NavSection",
          },
        },
      ],
    },
    // Unannotated component via barrel import in union children
    {
      name: "cross-file: unannotated component via barrel import in union children",
      code: `
        import { Nav, NavSection } from "./barrel";

        <Nav>
          <NavSection title="Reports" />
        </Nav>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "NavItem | NavGroup",
            actual: "NavSection",
          },
        },
      ],
    },
    // Wrong element in cross-file @renders* named prop
    {
      name: "cross-file: wrong element in @renders* named prop",
      code: `
        import { DashboardLayout } from "./DashboardLayout";

        <DashboardLayout navigation={<div>bad</div>}>
          <div />
        </DashboardLayout>;
      `,
      filename: path.resolve(fixturesDir, "consumer.tsx"),
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "navigation",
            expected: "NavItem | NavSection",
            actual: "div",
          },
        },
      ],
    },
  ],
});
