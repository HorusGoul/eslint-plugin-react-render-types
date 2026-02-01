# App Composition Patterns

Patterns for consuming a `@renders`-annotated design system in application code.

## Table of Contents

- [Page Layouts](#page-layouts)
- [Dashboard Composition](#dashboard-composition)
- [Navigation Structure](#navigation-structure)

## Page Layouts

Compose pages using typed slot props from a design system.

### Design system provides:

```tsx
// design-system/PageHeader.tsx
export function PageHeader({ title }: { title: string }) {
  return <header><h1>{title}</h1></header>;
}

// design-system/PageContent.tsx
export function PageContent({ children }: { children: React.ReactNode }) {
  return <section className="content">{children}</section>;
}

// design-system/PageLayout.tsx
import { PageHeader } from "./PageHeader";
import { PageContent } from "./PageContent";

interface PageLayoutProps {
  /** @renders {PageHeader} */
  header: React.ReactNode;
  /** @renders {PageContent} */
  children: React.ReactNode;
}

export function PageLayout({ header, children }: PageLayoutProps) {
  return <main>{header}{children}</main>;
}
```

### App consumes:

```tsx
// app/SettingsPage.tsx
import { PageLayout, PageHeader, PageContent } from "@/design-system";

export function SettingsPage() {
  return (
    <PageLayout header={<PageHeader title="Settings" />}>
      <PageContent>
        <form>...</form>
      </PageContent>
    </PageLayout>
  );
}
```

### App creates specialized headers:

```tsx
// app/components/BreadcrumbHeader.tsx
import { PageHeader } from "@/design-system";

/** @renders {PageHeader} */
export function BreadcrumbHeader({ crumbs, title }: { crumbs: string[]; title: string }) {
  return (
    <PageHeader title={title}>
      <Breadcrumbs items={crumbs} />
    </PageHeader>
  );
}

// app/ProductPage.tsx — BreadcrumbHeader satisfies @renders {PageHeader}
<PageLayout header={<BreadcrumbHeader crumbs={["Home", "Products"]} title="Products" />}>
  <PageContent>...</PageContent>
</PageLayout>
```

## Dashboard Composition

Build dashboards with typed card/widget areas.

### Design system provides:

```tsx
// design-system/DashboardCard.tsx
export function DashboardCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card"><h3>{title}</h3>{children}</div>;
}

// design-system/DashboardGrid.tsx
import { DashboardCard } from "./DashboardCard";

interface DashboardGridProps {
  /** @renders* {DashboardCard} */
  children: React.ReactNode;
}

export function DashboardGrid({ children }: DashboardGridProps) {
  return <div className="grid grid-cols-3 gap-4">{children}</div>;
}
```

### App creates specialized cards:

```tsx
// app/components/StatCard.tsx
import { DashboardCard } from "@/design-system";

/** @renders {DashboardCard} */
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <DashboardCard title={label}>
      <span className="text-3xl font-bold">{value}</span>
    </DashboardCard>
  );
}

// app/components/ChartCard.tsx
import { DashboardCard } from "@/design-system";

/** @renders {DashboardCard} */
export function ChartCard({ title, data }: { title: string; data: DataPoint[] }) {
  return (
    <DashboardCard title={title}>
      <Chart data={data} />
    </DashboardCard>
  );
}
```

### App composes the dashboard:

```tsx
// app/DashboardPage.tsx
<DashboardGrid>
  <StatCard label="Users" value={1234} />
  <StatCard label="Revenue" value={56789} />
  <ChartCard title="Growth" data={growthData} />
</DashboardGrid>
// OK — StatCard and ChartCard both @renders {DashboardCard}
```

## Navigation Structure

Typed sidebar/nav with enforced item types.

### Design system provides:

```tsx
// design-system/NavItem.tsx
export function NavItem({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return <a href={href}><span>{icon}</span>{label}</a>;
}

// design-system/NavSection.tsx
import { NavItem } from "./NavItem";

interface NavSectionProps {
  title: string;
  /** @renders* {NavItem} */
  children: React.ReactNode;
}

export function NavSection({ title, children }: NavSectionProps) {
  return <div><h4>{title}</h4><nav>{children}</nav></div>;
}

// design-system/Sidebar.tsx
import { NavItem } from "./NavItem";
import { NavSection } from "./NavSection";

interface SidebarProps {
  /** @renders* {NavItem | NavSection} */
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return <aside>{children}</aside>;
}
```

### App composes navigation:

```tsx
// app/AppShell.tsx
<Sidebar>
  <NavItem icon={<HomeIcon />} label="Home" href="/" />
  <NavSection title="Settings">
    <NavItem icon={<ProfileIcon />} label="Profile" href="/profile" />
    <NavItem icon={<BillingIcon />} label="Billing" href="/billing" />
  </NavSection>
</Sidebar>
// OK — Sidebar accepts NavItem | NavSection, NavSection accepts NavItem
```

### App creates specialized nav items:

```tsx
// app/components/BadgeNavItem.tsx
import { NavItem } from "@/design-system";

/** @renders {NavItem} */
export function BadgeNavItem({ icon, label, href, count }: Props) {
  return (
    <NavItem icon={icon} label={`${label} (${count})`} href={href} />
  );
}

// OK in Sidebar — BadgeNavItem @renders {NavItem}
<Sidebar>
  <BadgeNavItem icon={<InboxIcon />} label="Inbox" href="/inbox" count={5} />
</Sidebar>
```
