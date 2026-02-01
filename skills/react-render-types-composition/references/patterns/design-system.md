# Design System Patterns

## Table of Contents

- [Constrained Children](#constrained-children)
- [Typed Slot Props](#typed-slot-props)
- [Component Variants](#component-variants)

## Constrained Children

Restrict which components can be passed as children. The parent component annotates its `children` prop with `@renders` on the interface property.

### Single type

```tsx
// MenuItem.tsx — base component (no annotation needed)
export function MenuItem({ label }: { label: string }) {
  return <li className="menu-item">{label}</li>;
}

// Menu.tsx — constrains children to MenuItem only
import { MenuItem } from "./MenuItem";

interface MenuProps {
  /** @renders* {MenuItem} */
  children: React.ReactNode;
}

export function Menu({ children }: MenuProps) {
  return <ul role="menu">{children}</ul>;
}
```

Usage:

```tsx
// OK
<Menu>
  <MenuItem label="Cut" />
  <MenuItem label="Copy" />
</Menu>

// Error: expected MenuItem, got Button
<Menu>
  <Button>Click</Button>
</Menu>
```

### With dividers (union children)

```tsx
import { MenuItem } from "./MenuItem";
import { MenuDivider } from "./MenuDivider";

interface MenuProps {
  /** @renders* {MenuItem | MenuDivider} */
  children: React.ReactNode;
}

export function Menu({ children }: MenuProps) {
  return <ul role="menu">{children}</ul>;
}
```

```tsx
// OK — mix of MenuItem and MenuDivider
<Menu>
  <MenuItem label="Cut" />
  <MenuDivider />
  <MenuItem label="Paste" />
</Menu>
```

## Typed Slot Props

Named props that accept specific component types. Annotate each slot on the interface.

```tsx
import { PageHeader } from "./PageHeader";
import { PageContent } from "./PageContent";
import { PageFooter } from "./PageFooter";

interface PageLayoutProps {
  /** @renders {PageHeader} */
  header: React.ReactNode;
  /** @renders {PageContent} */
  children: React.ReactNode;
  /** @renders? {PageFooter} */
  footer?: React.ReactNode;
}

export function PageLayout({ header, children, footer }: PageLayoutProps) {
  return (
    <div className="page">
      {header}
      <main>{children}</main>
      {footer}
    </div>
  );
}
```

Usage:

```tsx
// OK
<PageLayout
  header={<PageHeader title="Dashboard" />}
  footer={<PageFooter />}
>
  <PageContent>...</PageContent>
</PageLayout>

// OK — footer is optional (@renders?)
<PageLayout header={<PageHeader title="Settings" />}>
  <PageContent>...</PageContent>
</PageLayout>

// Error: header expects PageHeader, got div
<PageLayout header={<div>Oops</div>}>
  <PageContent>...</PageContent>
</PageLayout>
```

## Component Variants

Specialized components that declare they render a base type, enabling them to be used anywhere the base type is expected.

```tsx
// Tab.tsx — base component
export function Tab({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="tabpanel">{children}</div>;
}

// IconTab.tsx — variant that renders Tab
import { Tab } from "./Tab";

/** @renders {Tab} */
export function IconTab({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <Tab label={label}><span>{icon}</span>{children}</Tab>;
}

// Tabs.tsx — accepts Tab in children
import { Tab } from "./Tab";

interface TabsProps {
  /** @renders* {Tab} */
  children: React.ReactNode;
}

export function Tabs({ children }: TabsProps) {
  return <div role="tablist">{children}</div>;
}
```

Usage:

```tsx
// OK — IconTab declares @renders {Tab}, so it satisfies the constraint
<Tabs>
  <Tab label="Overview">...</Tab>
  <IconTab icon={<StarIcon />} label="Favorites">...</IconTab>
</Tabs>
```

This pattern lets you create many specialized variants (e.g., `ClosableTab`, `DraggableTab`) that all satisfy the base `Tab` type without changing the parent's API.
