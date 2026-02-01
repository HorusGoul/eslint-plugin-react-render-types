# Advanced Patterns

## Table of Contents

- [Union Types](#union-types)
- [Type Aliases](#type-aliases)
- [Render Chains](#render-chains)
- [Unchecked Escape Hatch](#unchecked-escape-hatch)
- [Expression Analysis](#expression-analysis)

## Union Types

Accept multiple component types in a single slot using `|` syntax.

### Inline union on prop

```tsx
import { MenuItem } from "./MenuItem";
import { MenuDivider } from "./MenuDivider";

interface MenuProps {
  /** @renders* {MenuItem | MenuDivider} */
  children: React.ReactNode;
}
```

### Inline union on component return

```tsx
/** @renders {SuccessMessage | ErrorMessage} */
function StatusMessage({ ok }: { ok: boolean }) {
  return ok ? <SuccessMessage /> : <ErrorMessage />;
}
```

### Unions with modifiers

All modifiers combine with unions:

```tsx
/** @renders? {Header | Footer} */    // optional — null or one of the union
/** @renders* {MenuItem | Divider} */  // many — zero or more from the union
/** @renders! {Header | Footer} */     // unchecked union
```

## Type Aliases

Define reusable type unions and reference them in `@renders`. The plugin resolves the alias at lint time via TypeScript's type checker.

### Define the alias

```tsx
// types.ts
import { MenuItem } from "./MenuItem";
import { MenuDivider } from "./MenuDivider";
import { MenuHeader } from "./MenuHeader";

export type MenuChild = MenuItem | MenuDivider | MenuHeader;
```

### Use in component annotation

```tsx
import { MenuChild } from "./types";

/** @renders {MenuChild} */
function SpecialItem() {
  return <MenuItem label="Special" />;  // OK — MenuItem is part of MenuChild
}
```

### Use in prop annotation

```tsx
import { MenuChild } from "./types";

interface MenuProps {
  /** @renders* {MenuChild} */
  children: React.ReactNode;
}
```

Type aliases keep annotations concise when a slot accepts many types, and provide a single place to update the union when adding new component types.

## Render Chains

Components satisfy render types transitively. If A `@renders {Base}` and B returns A, then B also satisfies `@renders {Base}`.

```tsx
// Base component
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

// Level 1 — directly renders Card
/** @renders {Card} */
export function InfoCard({ title, body }: Props) {
  return <Card><h3>{title}</h3><p>{body}</p></Card>;
}

// Level 2 — renders InfoCard, which renders Card
/** @renders {Card} */
export function UserCard({ user }: { user: User }) {
  return <InfoCard title={user.name} body={user.bio} />;
}

// Level 3 — renders UserCard → InfoCard → Card
/** @renders {Card} */
export function AdminCard({ admin }: { admin: User }) {
  return <UserCard user={admin} />;
}
```

All three (InfoCard, UserCard, AdminCard) are valid wherever `@renders {Card}` is expected:

```tsx
interface GridProps {
  /** @renders* {Card} */
  children: React.ReactNode;
}

<Grid>
  <Card>Raw content</Card>
  <InfoCard title="Info" body="..." />
  <UserCard user={currentUser} />
  <AdminCard admin={adminUser} />
</Grid>
// All OK — chain resolves through @renders declarations
```

## Unchecked Escape Hatch

Use `@renders!` when the plugin can't statically analyze a component's return — component registries, dynamic rendering, render props from external libraries.

```tsx
const registry: Record<string, React.ComponentType> = {
  main: MainHeader,
  compact: CompactHeader,
};

/** @renders! {Header} */
function DynamicHeader({ variant }: { variant: string }) {
  const Component = registry[variant];
  return <Component />;  // Plugin can't trace this — no error with !
}
```

The `!` modifier tells the plugin: "Trust me, this renders Header." Other components can rely on it:

```tsx
/** @renders {Header} */
function AppHeader() {
  return <DynamicHeader variant="main" />;  // OK — DynamicHeader declares @renders! {Header}
}
```

Combine `!` with other modifiers:

```tsx
/** @renders?! {Header} */   // optional + unchecked
/** @renders*! {MenuItem} */  // many + unchecked
```

Use sparingly — `!` disables return validation, so the annotation is your responsibility to keep accurate.

## Expression Analysis

The plugin analyzes common expression patterns in component returns and inside transparent wrappers.

### Ternary expressions

```tsx
/** @renders {Header | Footer} */
function LayoutSlot({ position }: { position: "top" | "bottom" }) {
  return position === "top" ? <Header /> : <Footer />;
}
```

Both branches are checked against the declared types.

### Logical AND

```tsx
/** @renders? {Banner} */
function ConditionalBanner({ show }: { show: boolean }) {
  return <>{show && <Banner />}</>;
}
```

The plugin understands `condition && <X />` as an optional pattern.

### .map() and .flatMap()

```tsx
/** @renders* {ListItem} */
function ItemList({ items }: { items: Item[] }) {
  return <>{items.map(item => <ListItem key={item.id} data={item} />)}</>;
}
```

The plugin checks the callback's return type against the declared render type.

### Combined expressions

These patterns compose naturally:

```tsx
/** @renders* {MenuItem | MenuDivider} */
function DynamicMenu({ groups }: { groups: ItemGroup[] }) {
  return (
    <>
      {groups.flatMap((group, i) => [
        ...(i > 0 ? [<MenuDivider key={`div-${i}`} />] : []),
        ...group.items.map(item => <MenuItem key={item.id} label={item.label} />),
      ])}
    </>
  );
}
```
