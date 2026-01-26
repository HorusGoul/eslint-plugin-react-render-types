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

ruleTester.run("valid-render-prop", rule, {
  valid: [
    // Direct component to prop
    {
      name: "passing direct component to prop with @renders",
      code: `
        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        function Menu({ item }: MenuProps) {
          return <div>{item}</div>;
        }

        <Menu item={<MenuItem />} />;
      `,
      filename: "test.tsx",
    },
    // Component that renders expected type (chained)
    {
      name: "passing component that renders expected type",
      code: `
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
      filename: "test.tsx",
    },
    // Optional @renders? with null
    {
      name: "optional prop with null",
      code: `
        interface CardProps {
          /** @renders? {CardHeader} */
          header?: React.ReactNode;
        }

        <Card header={null} />;
      `,
      filename: "test.tsx",
    },
    // Children with @renders
    {
      name: "children prop with @renders",
      code: `
        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <Tab />
        </Tabs>;
      `,
      filename: "test.tsx",
    },
    // Many renders with multiple children
    {
      name: "many renders with multiple children",
      code: `
        interface ListProps {
          /** @renders* {ListItem} */
          children: React.ReactNode;
        }

        <List>
          <ListItem />
          <ListItem />
        </List>;
      `,
      filename: "test.tsx",
    },
    // No annotation - should be ignored
    {
      name: "prop without annotation is ignored",
      code: `
        interface MenuProps {
          item: React.ReactNode;
        }

        <Menu item={<div>Anything</div>} />;
      `,
      filename: "test.tsx",
    },
    // Prop not using @renders syntax is ignored
    {
      name: "prop with other JSDoc is ignored",
      code: `
        interface MenuProps {
          /** Some description */
          item: React.ReactNode;
        }

        <Menu item={<div>Anything</div>} />;
      `,
      filename: "test.tsx",
    },
  ],
  invalid: [
    // Wrong component passed to prop
    {
      name: "wrong component passed to prop",
      code: `
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
      code: `
        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<div>Not a MenuItem</div>} />;
      `,
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
      code: `
        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <Button />
        </Tabs>;
      `,
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
    // Optional but wrong component
    {
      name: "optional prop with wrong component",
      code: `
        interface CardProps {
          /** @renders? {CardHeader} */
          header?: React.ReactNode;
        }

        <Card header={<Footer />} />;
      `,
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
