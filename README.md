# eslint-plugin-react-render-types

[![npm version](https://img.shields.io/npm/v/eslint-plugin-react-render-types.svg)](https://www.npmjs.com/package/eslint-plugin-react-render-types)
[![CI](https://github.com/HorusGoul/eslint-plugin-react-render-types/actions/workflows/ci.yml/badge.svg)](https://github.com/HorusGoul/eslint-plugin-react-render-types/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An ESLint plugin that brings [Flow's Render Types](https://flow.org/en/docs/react/render-types/) to TypeScript via JSDoc comments. Enforce component composition constraints at lint time.

## The Problem

Design systems often need to constrain which components can be rendered in specific contexts. For example:
- A `Menu` should only accept `MenuItem` children
- A `Tabs` component should only render `Tab` components
- A `Card` header slot should only accept `CardHeader`

Without render types, these constraints can't be enforced at compile/lint time, leading to runtime errors or unexpected behavior.

## The Solution

This plugin allows you to annotate components with `@renders` JSDoc comments, then validates that:
1. Components return what they declare
2. Props expecting specific render types receive compatible components

## Example

See the [example project](./example/) for a full dashboard app demonstrating cross-file render type validation with a design system built on React, Vite, and shadcn/ui.

## Installation

```bash
npm install eslint-plugin-react-render-types --save-dev
# or
pnpm add -D eslint-plugin-react-render-types
# or
yarn add -D eslint-plugin-react-render-types
```

### Peer Dependencies

This plugin requires:
- `eslint` >= 9.0.0
- `@typescript-eslint/parser` >= 8.0.0
- `typescript` >= 5.0.0

## Agent Skills

This plugin provides agent skills for AI coding assistants (Claude Code, Cursor, Copilot, and [others](https://skills.sh/)). Install them to get help with setup, configuration, and composition patterns:

```bash
npx skills add HorusGoul/eslint-plugin-react-render-types
```

Available skills:

- **react-render-types-setup** — Install, configure, and troubleshoot the plugin in your project
- **react-render-types-composition** — Patterns for `@renders` annotations, transparent wrappers, render chains, and slot props

## Configuration

### ⚠️ Typed Linting Required

**This plugin requires typed linting.** Without it, the plugin will throw an error.

Typed linting connects ESLint to your TypeScript compiler, giving the plugin access to type information. This is required for:
- Resolving component type identity across files (components with the same name from different files are correctly distinguished)
- Following render chains through `@renders` annotations
- Validating that props receive correctly-typed components

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import reactRenderTypes from "eslint-plugin-react-render-types";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  reactRenderTypes.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        // REQUIRED: Enable typed linting
        projectService: true,
        // Or use the legacy project option:
        // project: './tsconfig.json',
      },
    },
  },
];
```

### Setting Up Typed Linting

There are two ways to enable typed linting:

#### Option 1: `projectService` (Recommended for ESLint 9+)

```javascript
{
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
}
```

This automatically infers the TypeScript configuration for each file.

#### Option 2: Explicit `project` Path

```javascript
{
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
      // For monorepos, you may need:
      // project: ['./tsconfig.json', './packages/*/tsconfig.json'],
    },
  },
}
```

For more details on typed linting setup, see the [typescript-eslint documentation](https://typescript-eslint.io/getting-started/typed-linting/).

### Manual Configuration

```javascript
// eslint.config.js
import reactRenderTypes from "eslint-plugin-react-render-types";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,  // REQUIRED for typed linting
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-render-types": reactRenderTypes,
    },
    rules: {
      "react-render-types/valid-render-return": "error",
      "react-render-types/valid-render-prop": "error",
    },
  },
];
```

### Troubleshooting Typed Linting

If you encounter issues:

1. **"Parsing error: Cannot read file tsconfig.json"** - Ensure the `project` path is correct relative to where ESLint runs

2. **"File is not part of a TypeScript project"** - Add the file to your `tsconfig.json`'s `include` array, or use `projectService: { allowDefaultProject: ['*.tsx'] }`

3. **Performance issues** - Typed linting is slower than regular linting. Consider using `TIMING=1 eslint .` to identify bottlenecks. For large projects, see [typescript-eslint performance docs](https://typescript-eslint.io/troubleshooting/typed-linting/performance/)

### Settings

#### `additionalTransparentComponents`

Specify component names that should be treated as transparent wrappers, allowing the plugin to "see through" them when validating `@renders` annotations. This is useful for built-in components like `Suspense` or third-party components you can't annotate with `@transparent`.

```javascript
// eslint.config.js
export default [
  // ...
  {
    settings: {
      "react-render-types": {
        additionalTransparentComponents: [
          "Suspense",
          "ErrorBoundary",
        ],
      },
    },
  },
];
```

With this setting, the plugin looks through configured components to validate their children:

```tsx
/** @renders {Header} */
function MyHeader() {
  return (
    <Suspense fallback={<Spinner />}>
      <Header />  {/* ✓ Plugin validates Header, not Suspense */}
    </Suspense>
  );
}
```

For member expressions like `<React.Suspense>`, use the dotted form: `"React.Suspense"`.

These work alongside `@transparent` JSDoc annotations — both sources are merged.

## JSDoc Syntax

### `@renders {Component}` - Required

The component **must** render the specified component type.

```tsx
/** @renders {Header} */
function MyHeader() {
  return <Header />;  // ✓ Valid
}

/** @renders {Header} */
function BadHeader() {
  return <Footer />;  // ✗ Error: Expected Header, got Footer
}

/** @renders {Header} */
function AlsoBad() {
  return null;  // ✗ Error: Expected Header, got null
}
```

### `@renders? {Component}` - Optional

The component **may** render the specified component type, or return nothing (`null`, `undefined`, `false`).

```tsx
/** @renders? {Header} */
function MaybeHeader({ show }: { show: boolean }) {
  if (!show) return null;  // ✓ Valid - null allowed
  return <Header />;       // ✓ Valid
}

/** @renders? {Header} */
function BadMaybeHeader() {
  return <Footer />;  // ✗ Error: Expected Header, got Footer
}
```

### `@renders* {Component}` - Many

The component **may** render zero or more of the specified component type. Supports arrays, fragments, and null.

```tsx
/** @renders* {MenuItem} */
function MenuItems({ items }: { items: string[] }) {
  return (
    <>
      {items.map(item => <MenuItem key={item}>{item}</MenuItem>)}
    </>
  );  // ✓ Valid - fragment with multiple MenuItems
}

/** @renders* {MenuItem} */
function SingleItem() {
  return <MenuItem />;  // ✓ Valid - single item allowed
}

/** @renders* {MenuItem} */
function NoItems() {
  return null;  // ✓ Valid - zero items allowed
}

/** @renders* {MenuItem} */
function BadItems() {
  return <Footer />;  // ✗ Error: Expected MenuItem, got Footer
}
```

### `@renders {A | B}` - Union Types

The component **must** render one of the specified component types.

```tsx
/** @renders {Header | Footer} */
function LayoutSection({ type }: { type: string }) {
  if (type === "header") return <Header />;  // ✓ Valid
  return <Footer />;                          // ✓ Valid
}

/** @renders {Header | Footer} */
function BadSection() {
  return <Sidebar />;  // ✗ Error: Expected Header | Footer, got Sidebar
}
```

Union types work with all modifiers:

```tsx
/** @renders? {Header | Footer} */
function MaybeSection({ show }: { show: boolean }) {
  if (!show) return null;  // ✓ Valid - optional
  return <Header />;       // ✓ Valid
}

/** @renders* {MenuItem | Divider} */
function MenuContent() {
  return (
    <>
      <MenuItem />
      <Divider />
    </>
  );  // ✓ Valid - multiple elements from union
}
```

### Type Alias Unions

You can use TypeScript type aliases to define union types and reference them in `@renders` annotations:

```tsx
type LayoutSlot = Header | Footer | Sidebar;

/** @renders {LayoutSlot} */
function Section({ type }: { type: string }) {
  if (type === "header") return <Header />;
  if (type === "sidebar") return <Sidebar />;
  return <Footer />;
}
```

This also works with prop annotations:

```tsx
type MenuChild = MenuItem | Divider;

interface MenuProps {
  /** @renders {MenuChild} */
  children: React.ReactNode;
}
```

The plugin resolves the type alias at lint time using TypeScript's type checker, expanding it to the underlying union members for validation.

### `@transparent` - Transparent Components

Transparent components are wrappers that don't affect render type validation. Mark a component as transparent so the plugin "looks through" it to validate the actual children being rendered.

```tsx
/** @transparent */
function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="wrapper">{children}</div>;
}

/** @renders {Header} */
function MyHeader() {
  return (
    <Wrapper>
      <Header />  {/* ✓ Valid - plugin looks through Wrapper */}
    </Wrapper>
  );
}

/** @renders {Header} */
function BadHeader() {
  return (
    <Wrapper>
      <Footer />  {/* ✗ Error: Expected Header, got Footer */}
    </Wrapper>
  );
}
```

Transparent components can be nested:

```tsx
/** @transparent */
function OuterWrapper({ children }: { children: React.ReactNode }) {
  return <div className="outer">{children}</div>;
}

/** @transparent */
function InnerWrapper({ children }: { children: React.ReactNode }) {
  return <span className="inner">{children}</span>;
}

/** @renders {Header} */
function MyHeader() {
  return (
    <OuterWrapper>
      <InnerWrapper>
        <Header />  {/* ✓ Valid - looks through both wrappers */}
      </InnerWrapper>
    </OuterWrapper>
  );
}
```

Transparent wrappers also work with props validation:

```tsx
/** @transparent */
function Wrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

interface TabsProps {
  /** @renders {Tab} */
  children: React.ReactNode;
}

<Tabs>
  <Wrapper><Tab /></Wrapper>  {/* ✓ Valid */}
</Tabs>
```

## Chained Rendering

Components can satisfy render types through other components that themselves have `@renders` annotations:

```tsx
/** @renders {Header} */
function BaseHeader() {
  return <Header size="large" />;
}

/** @renders {Header} */
function CustomHeader() {
  return <BaseHeader />;  // ✓ Valid - BaseHeader renders Header
}

/** @renders {Header} */
function StyledHeader() {
  return <CustomHeader />;  // ✓ Valid - chains through CustomHeader → BaseHeader → Header
}
```

## Props Validation

Annotate interface properties to enforce render types on props:

```tsx
interface MenuProps {
  /** @renders {MenuItem} */
  children: React.ReactNode;
}

function Menu({ children }: MenuProps) {
  return <ul>{children}</ul>;
}

// Usage
<Menu>
  <MenuItem />  {/* ✓ Valid */}
  <MenuItem />  {/* ✓ Valid */}
</Menu>

<Menu>
  <Button />  {/* ✗ Error: Expected MenuItem, got Button */}
</Menu>
```

### Named Props

```tsx
interface LayoutProps {
  /** @renders {Header} */
  header: React.ReactNode;

  /** @renders? {Footer} */
  footer?: React.ReactNode;
}

function Layout({ header, footer }: LayoutProps) {
  return (
    <div>
      {header}
      <main>...</main>
      {footer}
    </div>
  );
}

// Usage
<Layout
  header={<Header />}      // ✓ Valid
  footer={null}            // ✓ Valid - optional
/>

<Layout
  header={<div>Oops</div>} // ✗ Error: Expected Header, got div
/>
```

## Transparent Components

Transparent components are wrappers that don't affect render type validation. Mark them with the `@transparent` JSDoc tag so the plugin "looks through" the wrapper to find the actual component being rendered.

```tsx
/**
 * @transparent
 */
function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="wrapper">{children}</div>;
}

/** @renders {Header} */
function MyHeader() {
  return (
    <Wrapper>
      <Header />  {/* ✓ Valid - plugin looks through Wrapper */}
    </Wrapper>
  );
}
```

Without `@transparent`, the plugin would see `Wrapper` being returned and report an error because `Wrapper` is not `Header`.

### Nested Transparent Wrappers

Transparent wrappers can be nested:

```tsx
/** @transparent */
function OuterWrapper({ children }: { children: React.ReactNode }) {
  return <div className="outer">{children}</div>;
}

/** @transparent */
function InnerWrapper({ children }: { children: React.ReactNode }) {
  return <span className="inner">{children}</span>;
}

/** @renders {Header} */
function MyHeader() {
  return (
    <OuterWrapper>
      <InnerWrapper>
        <Header />  {/* ✓ Valid */}
      </InnerWrapper>
    </OuterWrapper>
  );
}
```

### Expression Children

The plugin can analyze expressions inside transparent wrappers (and in general):

```tsx
/** @transparent */
function Wrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

/** @renders? {Header} */
function ConditionalHeader({ show }: { show: boolean }) {
  return <Wrapper>{show && <Header />}</Wrapper>;  // ✓ Valid
}

/** @renders {Header | Footer} */
function FlexComponent({ isHeader }: { isHeader: boolean }) {
  return isHeader ? <Header /> : <Footer />;  // ✓ Valid
}

/** @renders* {MenuItem} */
function MenuItems({ items }: { items: string[] }) {
  return <>{items.map(item => <MenuItem key={item} />)}</>;  // ✓ Valid
}
```

Supported expression patterns:
- Logical AND: `{condition && <Component />}`
- Ternary: `{condition ? <A /> : <B />}`
- `.map()` / `.flatMap()` callbacks: `{items.map(item => <Component />)}`

## Unchecked Annotations (`@renders!`)

When the plugin can't statically analyze a component's return value (e.g., component registries, dynamic rendering), use `!` to skip return validation while still declaring the render type:

```tsx
/** @renders! {Header} */
function DynamicHeader({ type }: { type: string }) {
  return componentRegistry[type];  // Plugin can't analyze this — no error
}

/** @renders {Header} */
function MyHeader() {
  return <DynamicHeader type="main" />;  // ✓ Valid — DynamicHeader declares it renders Header
}
```

`!` combines with existing modifiers:
- `@renders! {X}` — required, unchecked
- `@renders?! {X}` — optional, unchecked
- `@renders*! {X}` — many, unchecked

## Supported Patterns

### Function Declarations

```tsx
/** @renders {Header} */
function MyHeader() {
  return <Header />;
}
```

### Arrow Functions

```tsx
/** @renders {Header} */
const MyHeader = () => <Header />;

/** @renders {Header} */
const MyHeader = () => {
  return <Header />;
};
```

### Function Expressions

```tsx
/** @renders {Header} */
const MyHeader = function() {
  return <Header />;
};
```

### Namespaced Components

```tsx
/** @renders {Menu.Item} */
function MyMenuItem() {
  return <Menu.Item />;
}
```

## Rules

### `react-render-types/valid-render-return`

Validates that function components return what their `@renders` annotation declares.

**Error Examples:**

```tsx
/** @renders {Header} */
function MyComponent() {
  return <Footer />;  // Error
}
```

```tsx
/** @renders {Header} */
function MyComponent() {
  return null;  // Error (use @renders? for optional)
}
```

### `react-render-types/valid-render-prop`

Validates that props with `@renders` annotations receive compatible components.

**Error Examples:**

```tsx
interface Props {
  /** @renders {MenuItem} */
  item: React.ReactNode;
}

<Menu item={<Button />} />  // Error: Expected MenuItem, got Button
```

### `react-render-types/valid-renders-jsdoc`

Validates `@renders` JSDoc annotation syntax. Catches common mistakes like missing braces or incorrect component name casing.

**Error Examples:**

```tsx
/** @renders Header */  // Error: Missing braces. Use: @renders {Header}
function MyHeader() {
  return <Header />;
}
```

```tsx
/** @renders {header} */  // Error: Component name should be PascalCase
function MyHeader() {
  return <Header />;
}
```

```tsx
/** @renders {} */  // Error: Provide a component name
function MyHeader() {
  return <Header />;
}
```

### `react-render-types/require-renders-annotation`

Requires `@renders` annotations on all React function components. **Disabled by default.**

This rule is useful for enforcing render type annotations in specific folders, such as a design system or shared component library.

**Example Configuration:**

```javascript
// eslint.config.js
export default [
  reactRenderTypes.configs.recommended,
  {
    // Enable for design system components only
    files: ["src/design-system/**/*.tsx"],
    rules: {
      "react-render-types/require-renders-annotation": "error",
    },
  },
];
```

**Error Examples:**

```tsx
// Error: Component 'MyHeader' is missing a @renders annotation
function MyHeader() {
  return <Header />;
}

// Error: Component 'Button' is missing a @renders annotation
const Button = () => <button>Click me</button>;
```

**Valid Examples:**

```tsx
/** @renders {Header} */
function MyHeader() {
  return <Header />;
}

// Non-components (lowercase name) are ignored
function helperFunction() {
  return <div>Helper</div>;
}

// Functions without JSX returns are ignored
function Calculator() {
  return 42;
}
```

### `react-render-types/renders-uses-vars`

Marks components referenced in `@renders` annotations as "used" to prevent `no-unused-vars` errors. **Enabled by default.**

When you import a component solely for use in a `@renders` annotation (without using it in JSX), ESLint's `no-unused-vars` would normally flag the import as unused. This rule prevents that by marking the component as used.

**Example:**

```tsx
import { Header } from './Header';  // Without this rule: "Header is defined but never used"

/** @renders {Header} */
function MyHeader() {
  return <HeaderWrapper />;  // HeaderWrapper itself @renders {Header}
}
```

This rule works similarly to `eslint-plugin-react`'s `jsx-uses-vars` rule.

## Comparison with Flow Render Types

| Feature | Flow | This Plugin |
|---------|------|-------------|
| Syntax | `renders Header` | `@renders {Header}` |
| Optional | `renders? Header` | `@renders? {Header}` |
| Many | `renders* Header` | `@renders* {Header}` |
| Union types | ✓ (language feature) | `@renders {A \| B}` |
| Type alias unions | ✓ (language feature) | `@renders {MyAlias}` (resolves `type MyAlias = A \| B`) |
| Transparent components | ✓ (`renders T`) | `@transparent` |
| Unchecked (escape hatch) | — | `@renders! {X}` |
| Expression analysis | ✓ | ✓ (ternary, `&&`, `.map()`) |
| Chained rendering | ✓ | ✓ |
| Props validation | ✓ | ✓ |
| Children validation | ✓ | ✓ |
| Compile-time checking | ✓ | ✓ (lint-time) |

## Limitations

- **Typed linting required** - This plugin uses TypeScript's type system for component identity resolution. See [Configuration](#configuration) for setup
- **Function components only** - Class components are not currently supported
- **JSDoc-based** - Requires explicit annotations (no inference)

## TypeScript Integration

This plugin uses `@typescript-eslint/parser` to parse TypeScript and JSX. **Typed linting must be enabled** for the plugin to work correctly - see the [Configuration](#configuration) section above.

The plugin:
- Requires `@typescript-eslint/parser` >= 8.0.0
- Requires typed linting (`projectService: true` or `project: './tsconfig.json'`)
- Works alongside your existing TypeScript configuration and other ESLint rules
- Is compatible with `typescript-eslint`'s recommended configs

### Why Typed Linting?

Unlike simple syntax-based rules, this plugin needs to understand the relationships between components. When you write:

```tsx
/** @renders {Header} */
function CustomHeader() {
  return <MyHeader />;  // Is this valid?
}
```

The plugin needs to know what `MyHeader` renders. This requires type information from TypeScript, which is only available with typed linting enabled.

Additionally, the plugin uses TypeScript's type system to ensure components are the same type, not just the same name. Two components named `Header` from different files are correctly treated as different types.

## License

MIT
