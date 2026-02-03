# `react-render-types/renders-uses-vars`

Marks components referenced in `@renders` annotations as "used" to prevent ESLint's `no-unused-vars` from flagging imports that are only referenced in annotations.

**Default**: `error`

## Why

When you import a component solely for use in a `@renders` annotation (without using it in JSX), ESLint's `no-unused-vars` would normally flag the import as unused. This rule prevents that by marking the component as used.

This rule works similarly to `eslint-plugin-react`'s `jsx-uses-vars` rule.

## Examples

### Without this rule

```tsx
import { Header } from './Header';  // "Header is defined but never used"

/** @renders {Header} */
function MyHeader() {
  return <HeaderWrapper />;  // HeaderWrapper itself @renders {Header}
}
```

### With this rule

```tsx
import { Header } from './Header';  // ✓ No warning — marked as used

/** @renders {Header} */
function MyHeader() {
  return <HeaderWrapper />;
}
```

## Note

This rule handles the ESLint side. For IDE-level unused import suppression (greyed-out imports, auto-removal on save), see the [TypeScript Language Service Plugin](../../README.md#ide-integration-unused-import-suppression).
