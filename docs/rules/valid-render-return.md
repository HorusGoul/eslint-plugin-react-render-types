# `react-render-types/valid-render-return`

Validates that function components return what their `@renders` annotation declares.

**Default**: `error`

## Examples

### Invalid

```tsx
/** @renders {Header} */
function MyComponent() {
  return <Footer />;  // Error: Expected Header, got Footer
}

/** @renders {Header} */
function MyComponent() {
  return null;  // Error: Expected Header, got null (use @renders? for optional)
}
```

### Valid

```tsx
/** @renders {Header} */
function MyHeader() {
  return <Header />;
}

/** @renders? {Header} */
function MaybeHeader({ show }: { show: boolean }) {
  if (!show) return null;
  return <Header />;
}

/** @renders* {MenuItem} */
function MenuItems({ items }: { items: string[] }) {
  return <>{items.map(item => <MenuItem key={item} />)}</>;
}
```

## Details

This rule checks that the JSX elements returned by a component match the type declared in its `@renders` annotation. It supports:

- All modifiers: `@renders` (required), `@renders?` (optional), `@renders*` (many), `@renders!` (unchecked)
- Union types: `@renders {Header | Footer}`
- Type alias unions: `@renders {LayoutSlot}` where `type LayoutSlot = Header | Footer`
- Chained rendering: returning a component that itself `@renders` the target type
- Transparent wrappers: `@transparent` components are "looked through"
- Expression patterns: ternaries, logical AND, `.map()` / `.flatMap()` callbacks
