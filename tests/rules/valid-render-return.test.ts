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
    // Union type - returning first component is valid
    {
      name: "union type returning first component",
      code: withComponents(
        `
        /** @renders {Header | Footer} */
        function FlexComponent() {
          return <Header />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Union type - returning second component is valid
    {
      name: "union type returning second component",
      code: withComponents(
        `
        /** @renders {Header | Footer} */
        function FlexComponent() {
          return <Footer />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Union type with conditional return
    {
      name: "union type with conditional return",
      code: withComponents(
        `
        /** @renders {Header | Footer} */
        function FlexComponent({ isHeader }: { isHeader: boolean }) {
          if (isHeader) {
            return <Header />;
          }
          return <Footer />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Union type with three components
    {
      name: "union type with three components",
      code: withComponents(
        `
        /** @renders {Header | Sidebar | Footer} */
        function FlexComponent({ type }: { type: string }) {
          if (type === "header") return <Header />;
          if (type === "sidebar") return <Sidebar />;
          return <Footer />;
        }
      `,
        ["Header", "Sidebar", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Optional union type
    {
      name: "optional union type with null return",
      code: withComponents(
        `
        /** @renders? {Header | Footer} */
        function MaybeFlexComponent({ show }: { show: boolean }) {
          if (!show) return null;
          return <Header />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Large union type with five components
    {
      name: "large union type with five components",
      code: withComponents(
        `
        /** @renders {Header | Sidebar | Content | Footer | Navigation} */
        function LayoutSection({ type }: { type: string }) {
          switch (type) {
            case "header": return <Header />;
            case "sidebar": return <Sidebar />;
            case "content": return <Content />;
            case "footer": return <Footer />;
            default: return <Navigation />;
          }
        }
      `,
        ["Header", "Sidebar", "Content", "Footer", "Navigation"]
      ),
      filename: "test.tsx",
    },
    // Large union type returning any valid component
    {
      name: "large union type returning middle component",
      code: withComponents(
        `
        /** @renders {A | B | C | D | E | F | G} */
        function AlphaComponent() {
          return <D />;
        }
      `,
        ["A", "B", "C", "D", "E", "F", "G"]
      ),
      filename: "test.tsx",
    },
    // Large union with @renders* modifier
    {
      name: "large union with many modifier",
      code: withComponents(
        `
        /** @renders* {MenuItem | Divider | SubMenu | MenuGroup} */
        function MenuContent() {
          return (
            <>
              <MenuItem />
              <Divider />
              <SubMenu />
            </>
          );
        }
      `,
        ["MenuItem", "Divider", "SubMenu", "MenuGroup"]
      ),
      filename: "test.tsx",
    },
    // Type alias union - returning first component is valid
    {
      name: "type alias union returning first component",
      code: withComponents(
        `
        type LayoutComponent = Header | Footer;
        /** @renders {LayoutComponent} */
        function MyLayout() {
          return <Header />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Type alias union - returning second component is valid
    {
      name: "type alias union returning second component",
      code: withComponents(
        `
        type LayoutComponent = Header | Footer;
        /** @renders {LayoutComponent} */
        function MyLayout() {
          return <Footer />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Type alias union with three components
    {
      name: "type alias union with three components",
      code: withComponents(
        `
        type FlexComponent = Header | Sidebar | Footer;
        /** @renders {FlexComponent} */
        function MyFlex({ type }: { type: string }) {
          if (type === "header") return <Header />;
          if (type === "sidebar") return <Sidebar />;
          return <Footer />;
        }
      `,
        ["Header", "Sidebar", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Type alias union with optional modifier
    {
      name: "type alias union with optional modifier",
      code: withComponents(
        `
        type LayoutComponent = Header | Footer;
        /** @renders? {LayoutComponent} */
        function MaybeLayout({ show }: { show: boolean }) {
          if (!show) return null;
          return <Header />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Large type alias union with five components
    {
      name: "large type alias union with five components",
      code: withComponents(
        `
        type LayoutSection = Header | Sidebar | Content | Footer | Navigation;
        /** @renders {LayoutSection} */
        function Section({ type }: { type: string }) {
          switch (type) {
            case "header": return <Header />;
            case "sidebar": return <Sidebar />;
            case "content": return <Content />;
            case "footer": return <Footer />;
            default: return <Navigation />;
          }
        }
      `,
        ["Header", "Sidebar", "Content", "Footer", "Navigation"]
      ),
      filename: "test.tsx",
    },
    // Transparent wrapper around correct component
    {
      name: "transparent wrapper around correct component",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header} */
        function MyHeader() {
          return <Wrapper><Header /></Wrapper>;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Nested transparent wrappers
    {
      name: "nested transparent wrappers",
      code: withComponents(
        `
        /** @transparent */
        function OuterWrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @transparent */
        function InnerWrapper({ children }: { children: React.ReactNode }) {
          return <span>{children}</span>;
        }

        /** @renders {Header} */
        function MyHeader() {
          return (
            <OuterWrapper>
              <InnerWrapper>
                <Header />
              </InnerWrapper>
            </OuterWrapper>
          );
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Transparent wrapper with union type annotation
    {
      name: "transparent wrapper with union type",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header | Footer} */
        function FlexComponent() {
          return <Wrapper><Header /></Wrapper>;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Transparent wrapper with optional modifier
    {
      name: "transparent wrapper with optional modifier and valid return",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders? {Header} */
        function MaybeHeader() {
          return <Wrapper><Header /></Wrapper>;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Transparent wrapper with chained rendering
    {
      name: "transparent wrapper with chained rendering",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header} */
        function BaseHeader() {
          return <Header />;
        }

        /** @renders {Header} */
        function MyHeader() {
          return <Wrapper><BaseHeader /></Wrapper>;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Logical AND expression returning component
    {
      name: "logical AND expression returning component",
      code: withComponents(
        `
        /** @renders? {Header} */
        function ConditionalHeader({ show }: { show: boolean }) {
          return show && <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Ternary expression with two valid components
    {
      name: "ternary expression with two valid components",
      code: withComponents(
        `
        /** @renders {Header | Footer} */
        function FlexComponent({ isHeader }: { isHeader: boolean }) {
          return isHeader ? <Header /> : <Footer />;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // Ternary with null branch
    {
      name: "ternary with null branch (optional)",
      code: withComponents(
        `
        /** @renders? {Header} */
        function MaybeHeader({ show }: { show: boolean }) {
          return show ? <Header /> : null;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Nested logical AND expressions
    {
      name: "nested logical AND expressions",
      code: withComponents(
        `
        /** @renders? {Header} */
        function DeepConditional({ cond1, cond2 }: { cond1: boolean; cond2: boolean }) {
          return cond1 && cond2 && <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Transparent wrapper with expression container child
    {
      name: "transparent wrapper with expression container child",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders? {Header} */
        function MyHeader({ show }: { show: boolean }) {
          return <Wrapper>{show && <Header />}</Wrapper>;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Transparent wrapper with ternary child
    {
      name: "transparent wrapper with ternary child",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header | Footer} */
        function FlexHeader({ isHeader }: { isHeader: boolean }) {
          return <Wrapper>{isHeader ? <Header /> : <Footer />}</Wrapper>;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
    },
    // .map() returning component inside Fragment
    {
      name: "map expression returning annotated component",
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
    // .flatMap() returning component
    {
      name: "flatMap expression returning annotated component",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function MenuItems({ items }: { items: string[][] }) {
          return <>{items.flatMap(group => group.map(item => <MenuItem key={item} />))}</>;
        }
      `,
        ["MenuItem"]
      ),
      filename: "test.tsx",
    },
    // .map() with block body
    {
      name: "map with block body returning annotated component",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function MenuItems({ items }: { items: string[] }) {
          return <>{items.map(item => {
            return <MenuItem key={item} />;
          })}</>;
        }
      `,
        ["MenuItem"]
      ),
      filename: "test.tsx",
    },
    // Exported function declaration with @renders
    {
      name: "exported function declaration with @renders",
      code: withComponents(
        `
        /** @renders {Header} */
        export function MyHeader() {
          return <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Exported arrow function with @renders
    {
      name: "exported arrow function with @renders",
      code: withComponents(
        `
        /** @renders {Header} */
        export const MyHeader = () => <Header />;
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Exported arrow function with block body and @renders
    {
      name: "exported arrow function with block body and @renders",
      code: withComponents(
        `
        /** @renders {Header} */
        export const MyHeader = () => {
          return <Header />;
        };
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Exported function expression with @renders
    {
      name: "exported function expression with @renders",
      code: withComponents(
        `
        /** @renders {Footer} */
        export const MyFooter = function() {
          return <Footer />;
        };
      `,
        ["Footer"]
      ),
      filename: "test.tsx",
    },
    // Export default function declaration with @renders
    {
      name: "export default function declaration with @renders",
      code: withComponents(
        `
        /** @renders {Header} */
        export default function MyHeader() {
          return <Header />;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // Exported @transparent wrapper
    {
      name: "exported transparent wrapper",
      code: withComponents(
        `
        /** @transparent */
        export function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header} */
        function MyHeader() {
          return <Wrapper><Header /></Wrapper>;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // @renders! escape hatch - skips return validation
    {
      name: "unchecked annotation skips return validation",
      code: withComponents(
        `
        const registry: Record<string, React.FC> = {};
        /** @renders! {Header} */
        function DynamicComponent({ type }: { type: string }) {
          return registry[type];
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // @renders?! escape hatch with optional
    {
      name: "unchecked optional annotation skips return validation",
      code: withComponents(
        `
        const registry: Record<string, React.FC> = {};
        /** @renders?! {Header} */
        function MaybeDynamic({ type }: { type?: string }) {
          return type ? registry[type] : null;
        }
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    // --- Configured transparent components (settings) ---
    {
      name: "configured transparent component wrapping correct return",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyHeader() {
          return <Suspense fallback={null}><Header /></Suspense>;
        }
      `,
        ["Header", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
    },
    {
      name: "configured and JSDoc transparent coexist",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header} */
        function MyHeader() {
          return <Suspense fallback={null}><Wrapper><Header /></Wrapper></Suspense>;
        }
      `,
        ["Header", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
    },
    {
      name: "configured transparent with nested correct components",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function MyMenu({ items }: { items: string[] }) {
          return <Suspense fallback={null}><>{items.map(i => <MenuItem key={i} />)}</></Suspense>;
        }
      `,
        ["MenuItem", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
    },

    // --- Named prop transparency (JSDoc @transparent {props}) ---
    {
      name: "transparent with named props extracts from children and attribute",
      code: withComponents(
        `
        /** @transparent {off, children} */
        function FeatureFlag({ name, off, children }: { name: string; off: React.ReactNode; children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {NavItem} */
        function MyNav() {
          return <FeatureFlag name="feat" off={<NavItem />}><NavItem /></FeatureFlag>;
        }
      `,
        ["NavItem"]
      ),
      filename: "test.tsx",
    },
    {
      name: "transparent with single named prop (fallback only)",
      code: withComponents(
        `
        /** @transparent {fallback} */
        function LazyLoad({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Spinner} */
        function MySpinner() {
          return <LazyLoad fallback={<Spinner />}><div>content</div></LazyLoad>;
        }
      `,
        ["Spinner"]
      ),
      filename: "test.tsx",
    },

    // --- Named prop transparency via settings (object format) ---
    {
      name: "settings object format extracts from named prop and children",
      code: withComponents(
        `
        /** @renders {CardWidget} */
        function MyWidget() {
          return <Toggle name="feat" off={<CardWidget />}><CardWidget /></Toggle>;
        }
      `,
        ["CardWidget", "Toggle"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: [
            { name: "Toggle", props: ["off", "children"] },
          ],
        },
      },
    },

    // --- forwardRef / memo support ---
    {
      name: "forwardRef with @renders returns correct component",
      code: withComponents(
        `
        declare const forwardRef: typeof import('react').forwardRef;
        /** @renders {Header} */
        const MyHeader = forwardRef<HTMLDivElement, {}>((props, ref) => {
          return <Header />;
        });
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    {
      name: "React.forwardRef with @renders returns correct component",
      code: withComponents(
        `
        import React from 'react';
        /** @renders {Header} */
        const MyHeader = React.forwardRef<HTMLDivElement, {}>((props, ref) => {
          return <Header />;
        });
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    {
      name: "memo with @renders returns correct component",
      code: withComponents(
        `
        declare const memo: typeof import('react').memo;
        /** @renders {Header} */
        const MyHeader = memo(() => <Header />);
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    {
      name: "React.memo with @renders returns correct component",
      code: withComponents(
        `
        import React from 'react';
        /** @renders {Header} */
        const MyHeader = React.memo(() => <Header />);
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    {
      name: "memo(forwardRef(...)) with @renders returns correct component",
      code: withComponents(
        `
        declare const memo: typeof import('react').memo;
        declare const forwardRef: typeof import('react').forwardRef;
        /** @renders {Header} */
        const MyHeader = memo(forwardRef<HTMLDivElement, {}>((props, ref) => {
          return <Header />;
        }));
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    {
      name: "exported forwardRef with @renders returns correct component",
      code: withComponents(
        `
        declare const forwardRef: typeof import('react').forwardRef;
        /** @renders {Header} */
        export const MyHeader = forwardRef<HTMLDivElement, {}>((props, ref) => {
          return <Header />;
        });
      `,
        ["Header"]
      ),
      filename: "test.tsx",
    },
    {
      name: "custom wrapper via additionalComponentWrappers setting",
      code: withComponents(
        `
        declare function observer(component: any): any;
        /** @renders {Header} */
        const MyHeader = observer(() => <Header />);
      `,
        ["Header"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalComponentWrappers: ["observer"],
        },
      },
    },
    {
      name: "custom wrapper with member expression via settings",
      code: withComponents(
        `
        declare const mobx: { observer: (component: any) => any };
        /** @renders {Header} */
        const MyHeader = mobx.observer(() => <Header />);
      `,
        ["Header"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalComponentWrappers: ["observer"],
        },
      },
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
    // Union type - returning component not in union is invalid
    {
      name: "union type returning component not in union",
      code: withComponents(
        `
        /** @renders {Header | Footer} */
        function FlexComponent() {
          return <Sidebar />;
        }
      `,
        ["Header", "Footer", "Sidebar"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header | Footer",
            actual: "Sidebar",
          },
        },
      ],
    },
    // Union type - returning primitive JSX is invalid
    {
      name: "union type returning primitive JSX",
      code: withComponents(
        `
        /** @renders {Header | Footer} */
        function FlexComponent() {
          return <div>Not a Header or Footer</div>;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header | Footer",
            actual: "div",
          },
        },
      ],
    },
    // Large union type - returning component not in union
    {
      name: "large union type returning component not in union",
      code: withComponents(
        `
        /** @renders {Header | Sidebar | Content | Footer | Navigation} */
        function LayoutSection() {
          return <Button />;
        }
      `,
        ["Header", "Sidebar", "Content", "Footer", "Navigation", "Button"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header | Sidebar | Content | Footer | Navigation",
            actual: "Button",
          },
        },
      ],
    },
    // Large union type with seven components - invalid return
    {
      name: "large union with seven components returning invalid",
      code: withComponents(
        `
        /** @renders {A | B | C | D | E | F | G} */
        function AlphaComponent() {
          return <H />;
        }
      `,
        ["A", "B", "C", "D", "E", "F", "G", "H"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "A | B | C | D | E | F | G",
            actual: "H",
          },
        },
      ],
    },
    // Type alias union - returning component not in union is invalid
    {
      name: "type alias union returning component not in union",
      code: withComponents(
        `
        type LayoutComponent = Header | Footer;
        /** @renders {LayoutComponent} */
        function MyLayout() {
          return <Sidebar />;
        }
      `,
        ["Header", "Footer", "Sidebar"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header | Footer",
            actual: "Sidebar",
          },
        },
      ],
    },
    // Type alias union - returning primitive JSX is invalid
    {
      name: "type alias union returning primitive JSX",
      code: withComponents(
        `
        type LayoutComponent = Header | Footer;
        /** @renders {LayoutComponent} */
        function MyLayout() {
          return <div>Not valid</div>;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header | Footer",
            actual: "div",
          },
        },
      ],
    },
    // Type alias union with required modifier - returning null is invalid
    {
      name: "type alias union required returning null",
      code: withComponents(
        `
        type LayoutComponent = Header | Footer;
        /** @renders {LayoutComponent} */
        function MyLayout() {
          return null;
        }
      `,
        ["Header", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header | Footer",
            actual: "null",
          },
        },
      ],
    },
    // Large type alias union - invalid return
    {
      name: "large type alias union returning invalid component",
      code: withComponents(
        `
        type LayoutSection = Header | Sidebar | Content | Footer | Navigation;
        /** @renders {LayoutSection} */
        function Section() {
          return <Button />;
        }
      `,
        ["Header", "Sidebar", "Content", "Footer", "Navigation", "Button"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header | Sidebar | Content | Footer | Navigation",
            actual: "Button",
          },
        },
      ],
    },
    // Transparent wrapper with wrong component
    {
      name: "transparent wrapper with wrong component",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header} */
        function MyHeader() {
          return <Wrapper><Footer /></Wrapper>;
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
    // Transparent wrapper with primitive element
    {
      name: "transparent wrapper with primitive element",
      code: withComponents(
        `
        /** @transparent */
        function Wrapper({ children }: { children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {Header} */
        function MyHeader() {
          return <Wrapper><div>Not a Header</div></Wrapper>;
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
    // Logical AND with wrong component
    {
      name: "logical AND with wrong component",
      code: withComponents(
        `
        /** @renders {Header} */
        function BadComponent({ show }: { show: boolean }) {
          return show && <Footer />;
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
    // Ternary with wrong component in one branch
    {
      name: "ternary with wrong component in consequent",
      code: withComponents(
        `
        /** @renders {Header} */
        function BadComponent({ cond }: { cond: boolean }) {
          return cond ? <Footer /> : <Header />;
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
    // Exported function returning wrong component
    {
      name: "exported function returning wrong component",
      code: withComponents(
        `
        /** @renders {Header} */
        export function MyHeader() {
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
    // Exported arrow function returning wrong component
    {
      name: "exported arrow function returning wrong component",
      code: withComponents(
        `
        /** @renders {Header} */
        export const MyHeader = () => <Footer />;
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
    // Export default function returning wrong component
    {
      name: "export default function returning wrong component",
      code: withComponents(
        `
        /** @renders {Header} */
        export default function MyHeader() {
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
    // .map() callback returning wrong component
    {
      name: "map callback returning wrong component",
      code: withComponents(
        `
        /** @renders* {MenuItem} */
        function BadMenu({ items }: { items: string[] }) {
          return <>{items.map(item => <Button key={item} />)}</>;
        }
      `,
        ["MenuItem", "Button"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "MenuItem",
            actual: "Button",
          },
        },
      ],
    },
    // --- Configured transparent components (settings) — invalid ---
    {
      name: "configured transparent wrapper with wrong child",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyBadHeader() {
          return <Suspense fallback={null}><Footer /></Suspense>;
        }
      `,
        ["Header", "Footer", "Suspense"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: ["Suspense"],
        },
      },
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
    {
      name: "Suspense is not transparent without setting",
      code: withComponents(
        `
        /** @renders {Header} */
        function MyHeaderNoSetting() {
          return <Suspense fallback={null}><Header /></Suspense>;
        }
      `,
        ["Header", "Suspense"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "Header",
            actual: "Suspense",
          },
        },
      ],
    },

    // --- Named prop transparency — invalid ---
    {
      name: "transparent named prop with wrong component in off prop",
      code: withComponents(
        `
        /** @transparent {off, children} */
        function FlagGate({ name, off, children }: { name: string; off: React.ReactNode; children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {NavItem} */
        function BadNav() {
          return <FlagGate name="feat" off={<Footer />}><NavItem /></FlagGate>;
        }
      `,
        ["NavItem", "Footer"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "NavItem",
            actual: "Footer",
          },
        },
      ],
    },
    {
      name: "transparent named prop with wrong component in children",
      code: withComponents(
        `
        /** @transparent {off, children} */
        function FlagSwitch({ name, off, children }: { name: string; off: React.ReactNode; children: React.ReactNode }) {
          return <div>{children}</div>;
        }

        /** @renders {NavItem} */
        function BadNavChildren() {
          return <FlagSwitch name="feat" off={<NavItem />}><Sidebar /></FlagSwitch>;
        }
      `,
        ["NavItem", "Sidebar"]
      ),
      filename: "test.tsx",
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "NavItem",
            actual: "Sidebar",
          },
        },
      ],
    },
    {
      name: "settings object format with wrong component in named prop",
      code: withComponents(
        `
        /** @renders {CardWidget} */
        function BadWidget() {
          return <Toggle name="feat" off={<Banner />}><CardWidget /></Toggle>;
        }
      `,
        ["CardWidget", "Banner", "Toggle"]
      ),
      filename: "test.tsx",
      settings: {
        "react-render-types": {
          additionalTransparentComponents: [
            { name: "Toggle", props: ["off", "children"] },
          ],
        },
      },
      errors: [
        {
          messageId: "invalidRenderReturn",
          data: {
            expected: "CardWidget",
            actual: "Banner",
          },
        },
      ],
    },

    // --- forwardRef / memo invalid cases ---
    {
      name: "forwardRef with @renders returns wrong component",
      code: withComponents(
        `
        declare const forwardRef: typeof import('react').forwardRef;
        /** @renders {Header} */
        const MyHeader = forwardRef<HTMLDivElement, {}>((props, ref) => {
          return <Footer />;
        });
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
    {
      name: "memo with @renders returns wrong component",
      code: withComponents(
        `
        declare const memo: typeof import('react').memo;
        /** @renders {Header} */
        const MyHeader = memo(() => <Footer />);
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
    {
      name: "memo(forwardRef(...)) with @renders returns wrong component",
      code: withComponents(
        `
        declare const memo: typeof import('react').memo;
        declare const forwardRef: typeof import('react').forwardRef;
        /** @renders {Header} */
        const MyHeader = memo(forwardRef<HTMLDivElement, {}>((props, ref) => {
          return <Footer />;
        }));
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
