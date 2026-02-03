# `react-render-types/valid-render-prop`

Validates that props and children with `@renders` annotations receive compatible components.

**Default**: `error`

## Examples

### Invalid

```tsx
interface MenuProps {
  /** @renders {MenuItem} */
  children: React.ReactNode;
}

<Menu>
  <Button />  {/* Error: Expected MenuItem, got Button */}
</Menu>

interface LayoutProps {
  /** @renders {Header} */
  header: React.ReactNode;
}

<Layout header={<div>Oops</div>} />  // Error: Expected Header, got div
```

### Valid

```tsx
<Menu>
  <MenuItem />
  <MenuItem />
</Menu>

<Layout
  header={<Header />}
  footer={null}          // ✓ Valid when using @renders?
/>
```

## Details

This rule resolves `@renders` annotations on component props — both `children` and named props — and validates that the JSX elements passed match the declared type. It supports:

- Children validation: `<Menu><MenuItem /></Menu>`
- Named props: `<Layout header={<Header />} />`
- All modifiers: `@renders`, `@renders?`, `@renders*`
- Cross-file resolution: annotations on props defined in external files are resolved via TypeScript's type checker
- Transparent wrappers: `@transparent` components in children are "looked through"
- Chained rendering: passing a component that itself `@renders` the target type
