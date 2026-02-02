---
name: react-render-types-composition
description: "Composition patterns for building React components with @renders type annotations from eslint-plugin-react-render-types. Use when: (1) writing React components that need @renders JSDoc annotations, (2) building a design system with enforced component composition (e.g., Menu only accepts MenuItem), (3) deciding which @renders modifier to use (required, optional, many, unchecked), (4) creating wrapper or transparent components, (5) annotating slot props like children/header/footer, (6) using render chains, union types, or type aliases with @renders, or (7) building app layouts that consume a @renders-annotated design system."
---

# React Render Types — Composition Patterns

Patterns for building React components with `@renders` type annotations. Covers design system primitives, app-level composition, and advanced techniques.

## Annotation Syntax Quick Reference

```
@renders {X}           Required — must return X
@renders? {X}          Optional — may return X or null
@renders* {X}          Many — zero or more X
@renders! {X}          Unchecked — declares X, skips return validation
@renders {A | B}       Union — must return A or B
@renders {MyAlias}     Type alias — resolves type MyAlias = A | B at lint time
@transparent           Wrapper — plugin looks through to validate children
                       (or use additionalTransparentComponents setting for built-ins)
```

## Pattern Categories

| Priority | Category | When to read |
|----------|----------|--------------|
| 1 | [Design System Patterns](#design-system-patterns) | Building constrained component APIs |
| 2 | [Wrapper Patterns](#wrapper-patterns) | Creating transparent or conditional wrappers |
| 3 | [App Composition Patterns](#app-composition-patterns) | Consuming a design system in app layouts |
| 4 | [Advanced Patterns](#advanced-patterns) | Unions, chains, dynamic rendering, expressions |

## Design System Patterns

Core patterns for building component libraries with enforced composition.

- `constrained-children` — Restrict children to specific component types (Menu → MenuItem)
- `typed-slot-props` — Enforce types on named slot props (header, footer, sidebar)
- `component-variants` — Create specialized variants that satisfy a base render type

Read detailed examples: [references/patterns/design-system.md](references/patterns/design-system.md)

## Wrapper Patterns

Patterns for components that wrap other content without breaking composition.

- `transparent-wrappers` — Mark layout/styling wrappers with `@transparent`
- `conditional-rendering` — Use `@renders?` and `@renders*` for optional/repeated content

Read detailed examples: [references/patterns/wrappers.md](references/patterns/wrappers.md)

## App Composition Patterns

Patterns for building app-level layouts that consume design system components.

- `page-layouts` — Compose pages with typed header/content/footer slots
- `dashboard-composition` — Build dashboards with constrained card/widget areas
- `navigation-structure` — Typed sidebar/nav with enforced nav item types

Read detailed examples: [references/patterns/app-composition.md](references/patterns/app-composition.md)

## Advanced Patterns

Techniques for complex scenarios.

- `union-types` — Accept multiple component types in a single slot
- `type-aliases` — Define reusable type unions for `@renders` annotations
- `render-chains` — Satisfy render types transitively through intermediate components
- `unchecked-escape-hatch` — Use `@renders!` for dynamic rendering the plugin can't analyze
- `expression-analysis` — Ternary, logical AND, and `.map()` in annotated returns

Read detailed examples: [references/patterns/advanced.md](references/patterns/advanced.md)

## Choosing the Right Modifier

```
Can the slot be empty?
├── No → Must always render something
│   ├── Exactly one component → @renders {X}
│   └── One of several types  → @renders {A | B}
└── Yes
    ├── Zero or one component  → @renders? {X}
    └── Zero or more instances → @renders* {X}

Can the plugin analyze the return?
├── Yes → use the modifier above
└── No (dynamic/registry) → add ! → @renders! {X}, @renders?! {X}, @renders*! {X}
```
