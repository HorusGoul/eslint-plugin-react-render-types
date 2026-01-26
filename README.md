# eslint-plugin-react-render-types

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

## Configuration

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
        projectService: true,
      },
    },
  },
];
```

### Manual Configuration

```javascript
// eslint.config.js
import reactRenderTypes from "eslint-plugin-react-render-types";

export default [
  {
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

## Cross-File Resolution

When a component imports another component whose `@renders` annotation can't be resolved (e.g., from a third-party library), the plugin will:
- Issue a **warning** (not an error)
- Allow the code to pass

This enables incremental adoption - you can add `@renders` annotations gradually without breaking your build.

## Comparison with Flow Render Types

| Feature | Flow | This Plugin |
|---------|------|-------------|
| Syntax | `renders Header` | `@renders {Header}` |
| Optional | `renders? Header` | `@renders? {Header}` |
| Many | `renders* Header` | `@renders* {Header}` |
| Chained rendering | ✓ | ✓ |
| Props validation | ✓ | ✓ |
| Children validation | ✓ | ✓ |
| Compile-time checking | ✓ | ✓ (lint-time) |

## Limitations

- **Function components only** - Class components are not currently supported
- **JSDoc-based** - Requires explicit annotations (no inference)
- **Same-file resolution** - Render chains are resolved within the same file; cross-file chains issue warnings

## TypeScript Integration

This plugin uses `@typescript-eslint/parser` to parse TypeScript and JSX. It works alongside your existing TypeScript configuration and other ESLint rules.

## License

MIT
