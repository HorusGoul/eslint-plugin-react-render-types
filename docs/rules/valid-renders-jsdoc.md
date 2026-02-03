# `react-render-types/valid-renders-jsdoc`

Validates `@renders` JSDoc annotation syntax. Catches common mistakes like missing braces or incorrect component name casing.

**Default**: `warn`

## Examples

### Invalid

```tsx
/** @renders Header */  // Error: Missing braces. Use: @renders {Header}
function MyHeader() {
  return <Header />;
}

/** @renders {header} */  // Error: Component name should be PascalCase
function MyHeader() {
  return <Header />;
}

/** @renders {} */  // Error: Provide a component name
function MyHeader() {
  return <Header />;
}
```

### Valid

```tsx
/** @renders {Header} */
function MyHeader() {
  return <Header />;
}

/** @renders? {Header | Footer} */
function MaybeSection() { ... }

/** @renders* {MenuItem} */
function MenuItems() { ... }

/** @renders! {Header} */
function DynamicHeader() { ... }
```
