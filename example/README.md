# Example — Design System Dashboard

A dashboard app demonstrating [`eslint-plugin-react-render-types`](https://github.com/HorusGoul/eslint-plugin-react-render-types) with cross-file render type validation.

Built with React, Vite, Tailwind CSS v4, and shadcn/ui.

## Quick Start

```bash
pnpm install
pnpm dev       # Start dev server
pnpm lint      # Run ESLint (shows intentional errors in InvalidUsage.tsx)
pnpm typecheck # Run TypeScript type checking
```

## Project Structure

```
src/
  design-system/           # Reusable primitives
    ui/                      Button, Card, Badge, Input, Table, Separator
    nav/                     NavItem, NavLink, NavSection, Sidebar
    data/                    DataTable, DataColumn, TextColumn, BadgeColumn, ActionColumn, StatusColumn
    layout/                  PageLayout, PageHeader, PageContent, FlexLayout
    forms/                   FormSection, FormField, TextField, SelectField

  components/              # App-level components built on design-system
    dashboard/               DashboardCard, DashboardGrid, StatCard, ChartCard,
                             ConditionalCard, MultiCard, DynamicCard, FlexSlot
    navigation/              AppNavLink

  layouts/                 # Page layouts
    DashboardLayout

  features/                # Pages
    dashboard/               DashboardPage
    invalid-usage/           InvalidUsage

  lib/                     # Utilities
    utils.ts
```

## Render Type Annotations

### Component annotations (`@renders`)

| File | Annotation | Meaning |
|---|---|---|
| `NavLink` | `@renders {NavItem}` | Returns a NavItem |
| `AppNavLink` | `@renders {NavItem}` | Chains through NavLink to NavItem |
| `StatCard` | `@renders {DashboardCard}` | Returns a DashboardCard |
| `ChartCard` | `@renders {DashboardCard}` | Returns a DashboardCard |
| `ConditionalCard` | `@renders? {DashboardCard}` | Optionally returns a DashboardCard |
| `MultiCard` | `@renders* {DashboardCard}` | Returns zero or more DashboardCards |
| `DynamicCard` | `@renders! {DashboardCard}` | Declares type but skips return validation |
| `FlexSlot` | `@renders {StatCard \| ChartCard}` | Returns one of two types |
| `StatusColumn` | `@renders {TextColumn \| BadgeColumn}` | Returns one of two types |
| `TextColumn` | `@renders {DataColumn}` | Returns a DataColumn |
| `BadgeColumn` | `@renders {DataColumn}` | Returns a DataColumn |
| `ActionColumn` | `@renders {DataColumn}` | Returns a DataColumn |
| `FormSection` | `@transparent` | Plugin looks through this wrapper |

### Prop annotations (`@renders` on interface properties)

| File | Prop | Annotation | Meaning |
|---|---|---|---|
| `Sidebar` | `children` | `@renders* {NavItem}` | Children must render NavItem |
| `DashboardLayout` | `navigation` | `@renders* {NavItem \| NavSection}` | Accepts NavItem or NavSection |
| `DashboardGrid` | `children` | `@renders* {DashboardCard}` | Children must render DashboardCard |
| `DashboardGrid` | `highlight` | `@renders? {StatCard \| ChartCard}` | Optional, accepts StatCard or ChartCard |
| `DataTable` | `children` | `@renders* {DataColumn}` | Children must render DataColumn |
| `PageLayout` | `header` | `@renders {PageHeader}` | Must receive a PageHeader |
| `PageLayout` | `children` | `@renders {PageContent}` | Must receive a PageContent |
| `FlexLayout` | `header` | `@renders {PageHeader \| PageContent}` | Accepts either type |

## ESLint Configuration

See [`eslint.config.js`](./eslint.config.js). Uses ESLint 9 flat config with `typescript-eslint` and the plugin's `recommended` config. Requires typed linting (`projectService: true`) for cross-file resolution.

## Invalid Usage

Run `pnpm lint` to see errors caught in [`InvalidUsage.tsx`](./src/features/invalid-usage/InvalidUsage.tsx):

- `valid-render-return` — wrong component returned, null when required, wrong chain
- `valid-render-prop` — wrong children, wrong prop type
- `valid-renders-jsdoc` — missing braces, lowercase name, empty annotation
