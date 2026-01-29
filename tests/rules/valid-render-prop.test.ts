import { RuleTester } from "@typescript-eslint/rule-tester";
import * as vitest from "vitest";
import rule from "../../src/rules/valid-render-prop.js";

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

ruleTester.run("valid-render-prop", rule, {
  valid: [
    // Direct component to prop
    {
      name: "passing direct component to prop with @renders",
      code: withComponents(
        `
        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        function Menu({ item }: MenuProps) {
          return <div>{item}</div>;
        }

        <Menu item={<MenuItem />} />;
      `,
        ["MenuItem", "Menu"]
      ),
      filename: "test.tsx",
    },
    // Component that renders expected type (chained)
    {
      name: "passing component that renders expected type",
      code: withComponents(
        `
        /** @renders {MenuItem} */
        function MyMenuItem() {
          return <MenuItem />;
        }

        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<MyMenuItem />} />;
      `,
        ["MenuItem", "Menu"]
      ),
      filename: "test.tsx",
    },
    // Optional @renders? with null
    {
      name: "optional prop with null",
      code: withComponents(
        `
        interface CardProps {
          /** @renders? {CardHeader} */
          header?: React.ReactNode;
        }

        <Card header={null} />;
      `,
        ["CardHeader", "Card"]
      ),
      filename: "test.tsx",
    },
    // Children with @renders
    {
      name: "children prop with @renders",
      code: withComponents(
        `
        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <Tab />
        </Tabs>;
      `,
        ["Tab", "Tabs"]
      ),
      filename: "test.tsx",
    },
    // Many renders with multiple children
    {
      name: "many renders with multiple children",
      code: withComponents(
        `
        interface ListProps {
          /** @renders* {ListItem} */
          children: React.ReactNode;
        }

        <List>
          <ListItem />
          <ListItem />
        </List>;
      `,
        ["ListItem", "List"]
      ),
      filename: "test.tsx",
    },
    // Union type in prop annotation - valid component
    {
      name: "union type prop with valid first component",
      code: withComponents(
        `
        interface LayoutProps {
          /** @renders {Header | Footer} */
          slot: React.ReactNode;
        }

        <Layout slot={<Header />} />;
      `,
        ["Header", "Footer", "Layout"]
      ),
      filename: "test.tsx",
    },
    // Union type in prop annotation - valid second component
    {
      name: "union type prop with valid second component",
      code: withComponents(
        `
        interface LayoutProps {
          /** @renders {Header | Footer} */
          slot: React.ReactNode;
        }

        <Layout slot={<Footer />} />;
      `,
        ["Header", "Footer", "Layout"]
      ),
      filename: "test.tsx",
    },
    // Union type in children annotation
    {
      name: "union type children with valid component",
      code: withComponents(
        `
        interface MenuProps {
          /** @renders {MenuItem | Divider} */
          children: React.ReactNode;
        }

        <Menu>
          <MenuItem />
          <Divider />
        </Menu>;
      `,
        ["MenuItem", "Divider", "Menu"]
      ),
      filename: "test.tsx",
    },
    // Type alias union in prop annotation
    {
      name: "type alias union in prop annotation",
      code: withComponents(
        `
        type LayoutSlot = Header | Footer;

        interface LayoutProps {
          /** @renders {LayoutSlot} */
          slot: React.ReactNode;
        }

        <Layout slot={<Header />} />;
      `,
        ["Header", "Footer", "Layout"]
      ),
      filename: "test.tsx",
    },
    // Type alias union in children annotation
    {
      name: "type alias union in children annotation",
      code: withComponents(
        `
        type MenuChild = MenuItem | Divider;

        interface MenuProps {
          /** @renders {MenuChild} */
          children: React.ReactNode;
        }

        <Menu>
          <MenuItem />
        </Menu>;
      `,
        ["MenuItem", "Divider", "Menu"]
      ),
      filename: "test.tsx",
    },
    // No annotation - should be ignored
    {
      name: "prop without annotation is ignored",
      code: withComponents(
        `
        interface MenuProps {
          item: React.ReactNode;
        }

        <Menu item={<div>Anything</div>} />;
      `,
        ["Menu"]
      ),
      filename: "test.tsx",
    },
    // Prop not using @renders syntax is ignored
    {
      name: "prop with other JSDoc is ignored",
      code: withComponents(
        `
        interface MenuProps {
          /** Some description */
          item: React.ReactNode;
        }

        <Menu item={<div>Anything</div>} />;
      `,
        ["Menu"]
      ),
      filename: "test.tsx",
    },
  ],
  invalid: [
    // Wrong component passed to prop
    {
      name: "wrong component passed to prop",
      code: withComponents(
        `
        /** @renders {Footer} */
        function MyFooter() {
          return <Footer />;
        }

        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<MyFooter />} />;
      `,
        ["Footer", "MenuItem", "Menu"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "item",
            expected: "MenuItem",
            actual: "MyFooter",
          },
        },
      ],
    },
    // Primitive element passed when component expected
    {
      name: "primitive element when component expected",
      code: withComponents(
        `
        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<div>Not a MenuItem</div>} />;
      `,
        ["MenuItem", "Menu"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "item",
            expected: "MenuItem",
            actual: "div",
          },
        },
      ],
    },
    // Children mismatch
    {
      name: "children type mismatch",
      code: withComponents(
        `
        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <Button />
        </Tabs>;
      `,
        ["Tab", "Button", "Tabs"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "Tab",
            actual: "Button",
          },
        },
      ],
    },
    // Union type prop - wrong component
    {
      name: "union type prop with wrong component",
      code: withComponents(
        `
        interface LayoutProps {
          /** @renders {Header | Footer} */
          slot: React.ReactNode;
        }

        <Layout slot={<Sidebar />} />;
      `,
        ["Header", "Footer", "Sidebar", "Layout"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "slot",
            expected: "Header | Footer",
            actual: "Sidebar",
          },
        },
      ],
    },
    // Union type children - wrong component
    {
      name: "union type children with wrong component",
      code: withComponents(
        `
        interface MenuProps {
          /** @renders {MenuItem | Divider} */
          children: React.ReactNode;
        }

        <Menu>
          <Button />
        </Menu>;
      `,
        ["MenuItem", "Divider", "Button", "Menu"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "MenuItem | Divider",
            actual: "Button",
          },
        },
      ],
    },
    // Optional but wrong component
    {
      name: "optional prop with wrong component",
      code: withComponents(
        `
        interface CardProps {
          /** @renders? {CardHeader} */
          header?: React.ReactNode;
        }

        <Card header={<Footer />} />;
      `,
        ["CardHeader", "Footer", "Card"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "header",
            expected: "CardHeader",
            actual: "Footer",
          },
        },
      ],
    },
  ],
});
