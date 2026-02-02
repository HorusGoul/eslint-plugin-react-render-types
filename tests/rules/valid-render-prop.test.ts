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
    // Transparent wrapper passed as prop value
    {
      name: "transparent wrapper as prop value",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<Wrapper><MenuItem /></Wrapper>} />;
      `,
        ["MenuItem", "Menu"]
      ),
      filename: "test.tsx",
    },
    // Transparent wrapper as children
    {
      name: "transparent wrapper as children",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <Wrapper><Tab /></Wrapper>
        </Tabs>;
      `,
        ["Tab", "Tabs"]
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
    // Logical AND expression in children
    {
      name: "logical AND expression in children",
      code: withComponents(
        `
        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        declare const show: boolean;
        <Tabs>{show && <Tab />}</Tabs>;
      `,
        ["Tab", "Tabs"]
      ),
      filename: "test.tsx",
    },
    // Ternary expression in prop
    {
      name: "ternary expression in prop",
      code: withComponents(
        `
        interface LayoutProps {
          /** @renders {Header | Footer} */
          slot: React.ReactNode;
        }

        declare const isTop: boolean;
        <Layout slot={isTop ? <Header /> : <Footer />} />;
      `,
        ["Header", "Footer", "Layout"]
      ),
      filename: "test.tsx",
    },
    // Exported component with @renders used as prop value
    {
      name: "exported component with @renders used as prop value",
      code: withComponents(
        `
        /** @renders {MenuItem} */
        export function MyMenuItem() {
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
    // Exported arrow component with @renders used as children
    {
      name: "exported arrow component with @renders used as children",
      code: withComponents(
        `
        /** @renders {Tab} */
        export const MyTab = () => <Tab />;

        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <MyTab />
        </Tabs>;
      `,
        ["Tab", "Tabs"]
      ),
      filename: "test.tsx",
    },
    // Exported component with @renders in chained rendering for prop
    {
      name: "exported component chained rendering in prop",
      code: withComponents(
        `
        /** @renders {MenuItem} */
        export function BaseMenuItem() {
          return <MenuItem />;
        }

        /** @renders {MenuItem} */
        function CustomMenuItem() {
          return <BaseMenuItem />;
        }

        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<CustomMenuItem />} />;
      `,
        ["MenuItem", "Menu"]
      ),
      filename: "test.tsx",
    },
    // Exported transparent wrapper used in prop
    {
      name: "exported transparent wrapper used in prop",
      code: withComponents(
        `
        /** @transparent */
        export function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<Wrapper><MenuItem /></Wrapper>} />;
      `,
        ["MenuItem", "Menu"]
      ),
      filename: "test.tsx",
    },
    // .map() expression in children
    {
      name: "map expression in children",
      code: withComponents(
        `
        interface MenuProps {
          /** @renders {MenuItem} */
          children: React.ReactNode;
        }

        declare const items: string[];
        <Menu>{items.map(item => <MenuItem key={item} />)}</Menu>;
      `,
        ["MenuItem", "Menu"]
      ),
      filename: "test.tsx",
    },
    // Union @renders* children accepts annotated chain and direct unannotated match
    {
      name: "union @renders* children accepts annotated and unannotated components",
      code: withComponents(
        `
        /** @renders {NavItem} */
        function NavLink() {
          return <NavItem />;
        }

        interface SidebarProps {
          /** @renders* {NavItem | NavSection} */
          children: React.ReactNode;
        }

        <Sidebar>
          <NavLink />
          <NavSection />
        </Sidebar>;
      `,
        ["NavItem", "NavSection", "Sidebar"]
      ),
      filename: "test.tsx",
    },
    // Union @renders* named prop via fragment accepts annotated and unannotated
    {
      name: "union @renders* named prop via fragment accepts annotated and unannotated",
      code: withComponents(
        `
        /** @renders {NavItem} */
        function NavLink() {
          return <NavItem />;
        }

        interface LayoutProps {
          /** @renders* {NavItem | NavSection} */
          navigation: React.ReactNode;
        }

        <Layout navigation={<><NavLink /><NavSection /></>} />;
      `,
        ["NavItem", "NavSection", "Layout"]
      ),
      filename: "test.tsx",
    },
    // --- Configured transparent components (settings) ---
    {
      name: "configured transparent wrapper in prop value",
      code: withComponents(
        `
        interface ToolbarProps {
          /** @renders {ToolbarButton} */
          action: React.ReactNode;
        }

        <Toolbar action={<Suspense fallback={null}><ToolbarButton /></Suspense>} />;
      `,
        ["ToolbarButton", "Toolbar", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
    },
    {
      name: "configured transparent wrapper in children",
      code: withComponents(
        `
        interface AccordionProps {
          /** @renders {AccordionItem} */
          children: React.ReactNode;
        }

        <Accordion>
          <Suspense fallback={null}><AccordionItem /></Suspense>
        </Accordion>;
      `,
        ["AccordionItem", "Accordion", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
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
    // Transparent wrapper with wrong component as prop
    {
      name: "transparent wrapper with wrong component as prop",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        interface MenuProps {
          /** @renders {MenuItem} */
          item: React.ReactNode;
        }

        <Menu item={<Wrapper><Footer /></Wrapper>} />;
      `,
        ["MenuItem", "Footer", "Menu"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "item",
            expected: "MenuItem",
            actual: "Footer",
          },
        },
      ],
    },
    // Transparent wrapper with wrong component as children
    {
      name: "transparent wrapper with wrong component as children",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <Wrapper><Button /></Wrapper>
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
    // Logical AND with wrong component in children
    {
      name: "logical AND with wrong component in children",
      code: withComponents(
        `
        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        declare const show: boolean;
        <Tabs>{show && <Button />}</Tabs>;
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
    // Exported component with wrong @renders used as prop
    {
      name: "exported component with wrong renders used as prop",
      code: withComponents(
        `
        /** @renders {Footer} */
        export function MyFooter() {
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
    // Exported arrow component with wrong @renders used as children
    {
      name: "exported arrow component with wrong renders used as children",
      code: withComponents(
        `
        /** @renders {Footer} */
        export const MyFooter = () => <Footer />;

        interface TabsProps {
          /** @renders {Tab} */
          children: React.ReactNode;
        }

        <Tabs>
          <MyFooter />
        </Tabs>;
      `,
        ["Footer", "Tab", "Tabs"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "Tab",
            actual: "MyFooter",
          },
        },
      ],
    },
    // Unannotated component among valid children with @renders*
    {
      name: "unannotated component in @renders* children",
      code: withComponents(
        `
        /** @renders {NavItem} */
        function NavLink() {
          return <NavItem />;
        }

        interface SidebarProps {
          /** @renders* {NavItem} */
          children: React.ReactNode;
        }

        <Sidebar>
          <NavLink />
          <NavSection />
        </Sidebar>;
      `,
        ["NavItem", "NavSection", "Sidebar"]
      ),
      filename: "test.tsx",
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
    // Unannotated component in @renders* named prop via fragment
    {
      name: "unannotated component in @renders* named prop via fragment",
      code: withComponents(
        `
        /** @renders {NavItem} */
        function NavLink() {
          return <NavItem />;
        }

        interface LayoutProps {
          /** @renders* {NavItem} */
          navigation: React.ReactNode;
        }

        <Layout navigation={<><NavLink /><NavSection /></>} />;
      `,
        ["NavItem", "NavSection", "Layout"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "navigation",
            expected: "NavItem",
            actual: "NavSection",
          },
        },
      ],
    },
    // Ternary with wrong component in prop
    {
      name: "ternary with wrong component in prop",
      code: withComponents(
        `
        interface CardProps {
          /** @renders {CardHeader} */
          header: React.ReactNode;
        }

        declare const cond: boolean;
        <Card header={cond ? <Footer /> : <CardHeader />} />;
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
    // --- Configured transparent components (settings) — invalid ---
    {
      name: "configured transparent wrapper with wrong child in prop",
      code: withComponents(
        `
        interface ToolbarProps {
          /** @renders {ToolbarButton} */
          action: React.ReactNode;
        }

        <Toolbar action={<Suspense fallback={null}><Footer /></Suspense>} />;
      `,
        ["ToolbarButton", "Footer", "Toolbar", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
      errors: [
        {
          messageId: "invalidRenderProp",
          data: {
            propName: "action",
            expected: "ToolbarButton",
            actual: "Footer",
          },
        },
      ],
    },
    {
      name: "configured transparent wrapper with wrong child in children",
      code: withComponents(
        `
        interface AccordionProps {
          /** @renders {AccordionItem} */
          children: React.ReactNode;
        }

        <Accordion>
          <Suspense fallback={null}><Button /></Suspense>
        </Accordion>;
      `,
        ["AccordionItem", "Button", "Accordion", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
      errors: [
        {
          messageId: "invalidRenderChildren",
          data: {
            expected: "AccordionItem",
            actual: "Button",
          },
        },
      ],
    },
  ],
});
