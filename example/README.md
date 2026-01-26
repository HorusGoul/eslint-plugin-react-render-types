# Example: Design System with Render Types

This example demonstrates how to use `eslint-plugin-react-render-types` with a realistic design system.

## Structure

```
src/
├── components/          # Design System Components
│   ├── Card.tsx        # Card, CardHeader, CardFooter, CardLayout
│   ├── Menu.tsx        # Menu, MenuItem, IconMenuItem, etc.
│   ├── Tabs.tsx        # Tabs, Tab, IconTab, BadgeTab, etc.
│   └── index.ts        # Barrel exports
└── pages/
    ├── ValidUsage.tsx   # Examples that PASS lint
    └── InvalidUsage.tsx # Examples that FAIL lint (for demonstration)
```

## Design System Components

### Card System

| Component | @renders | Description |
|-----------|----------|-------------|
| `CardHeader` | (base) | Base header component |
| `IconHeader` | `{CardHeader}` | Header with icon |
| `TitleHeader` | `{CardHeader}` | Header with title/subtitle |
| `DismissibleHeader` | `{CardHeader}` | Closeable header (chains through IconHeader) |
| `CardLayout` | - | Layout with `header: @renders {CardHeader}`, `footer?: @renders? {CardFooter}` |

### Menu System

| Component | @renders | Description |
|-----------|----------|-------------|
| `MenuItem` | (base) | Base menu item |
| `IconMenuItem` | `{MenuItem}` | Menu item with icon |
| `DangerMenuItem` | `{MenuItem}` | Destructive action item |
| `CheckboxMenuItem` | `{MenuItem}` | Toggleable item |
| `Menu` | - | Container with `children: @renders* {MenuItem}` |

### Tabs System

| Component | @renders | Description |
|-----------|----------|-------------|
| `Tab` | (base) | Base tab component |
| `IconTab` | `{Tab}` | Tab with icon |
| `BadgeTab` | `{Tab}` | Tab with count badge |
| `CloseableTab` | `{Tab}` | Closeable tab |
| `Tabs` | - | Container with `children: @renders* {Tab}` |

## Running the Example

```bash
# Install dependencies
pnpm install

# Run linting (will show errors in InvalidUsage.tsx)
pnpm lint

# Type check
pnpm typecheck
```

## Expected Lint Errors

Running `pnpm lint` shows errors from the `valid-render-return` rule in `InvalidUsage.tsx`:

| # | Component | Error |
|---|-----------|-------|
| 1 | `BrokenHeader` | `@renders {CardHeader}` but returns `CardBody` |
| 2 | `BrokenMenuItem` | `@renders {MenuItem}` but returns `null` |
| 3 | `DivMenuItem` | `@renders {MenuItem}` but returns `div` |
| 4 | `WrongTab` | `@renders {Tab}` but returns `TabPanel` |
| 5 | `ChainedWrong` | `@renders {CardHeader}` but returns component that renders `CardFooter` |
| 6 | `ConditionalWrong` | One return path returns `CardFooter` (expects `CardHeader`) |

### Prop Validation (same-file only)

The `valid-render-prop` rule validates props/children with `@renders` annotations, but **only when the interface is defined in the same file**. This is a current limitation.

To see prop validation in action, check `test-single-file.tsx` which defines both the interface and usage in one file:

```bash
# This will show the prop validation error
pnpm lint | grep test-single-file
```

## Key Patterns Demonstrated

### 1. Required Render Types (`@renders`)

```tsx
/** @renders {MenuItem} */
function IconMenuItem({ icon, children }) {
  return <MenuItem><span>{icon}</span>{children}</MenuItem>;
}
```

### 2. Optional Render Types (`@renders?`)

```tsx
interface CardLayoutProps {
  /** @renders? {CardFooter} */
  footer?: React.ReactNode;  // Can be CardFooter or null/undefined
}
```

### 3. Many Render Types (`@renders*`)

```tsx
interface MenuProps {
  /** @renders* {MenuItem} */
  children: React.ReactNode;  // Zero or more MenuItems
}
```

### 4. Chained Rendering

```tsx
// DismissibleHeader -> IconHeader -> CardHeader
// All are valid where CardHeader is expected

/** @renders {CardHeader} */
function DismissibleHeader() {
  return <IconHeader>...</IconHeader>;  // IconHeader @renders {CardHeader}
}
```

### 5. Props with Render Types (same-file)

```tsx
// Interface must be in the same file as the JSX usage
interface CardLayoutProps {
  /** @renders {CardHeader} */
  header: React.ReactNode;
}

// Valid:
<CardLayout header={<CardHeader>...</CardHeader>} />
<CardLayout header={<IconHeader>...</IconHeader>} />  // chains to CardHeader

// Invalid:
<CardLayout header={<div>...</div>} />  // Error!
```

## Current Limitations

1. **Cross-file prop validation**: Prop/children annotations are only checked when the interface is defined in the same file as the JSX usage. This is because the ESLint rule doesn't have access to type information from imported modules.

2. **Cross-file render chain resolution**: When a component returns another component defined in a different file, the chain cannot be verified. The rule allows unknown components (assumes valid) to enable incremental adoption.

These limitations may be addressed in future versions using TypeScript's type checker for cross-file resolution.
