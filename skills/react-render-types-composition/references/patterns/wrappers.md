# Wrapper Patterns

## Table of Contents

- [Transparent Wrappers](#transparent-wrappers)
- [Conditional Rendering](#conditional-rendering)

## Transparent Wrappers

Components that wrap content for layout, styling, animation, or error handling without affecting composition validation. Mark with `@transparent` so the plugin looks through to the actual children.

### Styling wrapper

```tsx
/** @transparent */
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg shadow-md p-4">{children}</div>;
}
```

### Animation wrapper

```tsx
/** @transparent */
export function FadeIn({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
```

### Error boundary wrapper

```tsx
/** @transparent */
export function SafeRender({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
```

### Using transparent wrappers

Transparent wrappers don't break render type validation:

```tsx
/** @renders {Header} */
function StyledHeader() {
  return (
    <FadeIn>
      <Card>
        <Header title="Dashboard" />
      </Card>
    </FadeIn>
  );
  // OK — plugin looks through FadeIn and Card to find Header
}
```

They also work in prop/children positions:

```tsx
interface TabsProps {
  /** @renders* {Tab} */
  children: React.ReactNode;
}

// OK — plugin sees through Card to find Tab
<Tabs>
  <Card><Tab label="First">...</Tab></Card>
  <Card><Tab label="Second">...</Tab></Card>
</Tabs>
```

### When NOT to use `@transparent`

Don't mark a component as transparent if it adds semantic meaning to composition. For example, a `TabPanel` that renders differently from a `Tab` should NOT be transparent — it's a distinct component type.

## Conditional Rendering

Use modifiers to express optionality in component returns.

### Optional component (`@renders?`)

Return the component or nothing:

```tsx
/** @renders? {Banner} */
function PromoBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return <Banner message="Sale!" />;
}
```

### Zero or more (`@renders*`)

Return any number of instances via fragments, arrays, or `.map()`:

```tsx
/** @renders* {NotificationItem} */
function NotificationList({ items }: { items: Notification[] }) {
  if (items.length === 0) return null;
  return (
    <>
      {items.map(item => (
        <NotificationItem key={item.id} notification={item} />
      ))}
    </>
  );
}
```

### Conditional with expressions

The plugin analyzes common expression patterns:

```tsx
/** @renders? {Header} */
function MaybeHeader({ show }: { show: boolean }) {
  return <>{show && <Header />}</>;  // Logical AND — OK
}

/** @renders {Header | Footer} */
function LayoutSection({ isHeader }: { isHeader: boolean }) {
  return isHeader ? <Header /> : <Footer />;  // Ternary — OK
}

/** @renders* {MenuItem} */
function Items({ items }: { items: string[] }) {
  return <>{items.map(item => <MenuItem key={item} />)}</>;  // .map() — OK
}
```
