# `react-render-types/require-renders-annotation`

Requires `@renders` annotations on all React function components.

**Default**: `off`

## When to Use

This rule is useful for enforcing render type annotations in specific folders, such as a design system or shared component library.

## Configuration

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

## Examples

### Invalid

```tsx
// Error: Component 'MyHeader' is missing a @renders annotation
function MyHeader() {
  return <Header />;
}

// Error: Component 'Button' is missing a @renders annotation
const Button = () => <button>Click me</button>;
```

### Valid

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
