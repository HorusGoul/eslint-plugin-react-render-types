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

### ⚠️ Important: Typed Linting Required

**This plugin requires typed linting to be configured.** Without it, the plugin cannot resolve render chains or validate component relationships properly.

Typed linting connects ESLint to your TypeScript compiler, giving the plugin access to type information. This is what enables features like:
- Resolving which component a `@renders` annotation refers to
- Following render chains across component boundaries
- Validating that props receive correctly-typed components

If you see unexpected behavior or missing errors, ensure typed linting is properly configured.

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
- **Typed linting required** - See [Configuration](#configuration) for setup instructions

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

Without typed linting, the plugin will still run but may not catch all errors or may produce false positives.

## License

MIT
