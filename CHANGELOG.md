# eslint-plugin-react-render-types

## 0.6.0

### Minor Changes

- [#12](https://github.com/HorusGoul/eslint-plugin-react-render-types/pull/12) [`566cd91`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/566cd916c3d49cc71ddf6619a0c1e2c1997ed443) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add TypeScript Language Service Plugin that prevents IDEs from greying out or auto-removing imports referenced in `@renders` annotations. Enable in `tsconfig.json` with `{ "plugins": [{ "name": "eslint-plugin-react-render-types/language-service-plugin" }] }`.

## 0.5.0

### Minor Changes

- [#10](https://github.com/HorusGoul/eslint-plugin-react-render-types/pull/10) [`dae9095`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/dae90951f278d5d15eb2ef8736a3f33a759e6e20) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add `additionalTransparentComponents` shared setting with named prop support

  - **Configurable transparent components**: New ESLint shared setting `settings["react-render-types"].additionalTransparentComponents` lets users specify component names (e.g., `"Suspense"`, `"ErrorBoundary"`) to treat as transparent without requiring `@transparent` JSDoc annotations.
  - **Named prop transparency**: Use `@transparent {off, children}` JSDoc syntax or object format in settings (`{ name: "Flag", props: ["off", "children"] }`) to specify which props the plugin should look through — not just `children`.
  - **Both rules supported**: Works with `valid-render-return` and `valid-render-prop` — the plugin looks through configured components to validate their children and named props.
  - **Member expression support**: Use dotted names like `"React.Suspense"` for member expression JSX.
  - **Merges with JSDoc**: Configured names are merged with `@transparent` annotations found during AST traversal.

- [`bdce5ca`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/bdce5caf44ff91c4f66ca7b7dec2beadbf8213a2) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add cross-file prop annotation resolution for `valid-render-prop`

  - **Cross-file `@renders` on props**: The rule now resolves `@renders` annotations on props defined in external files. Previously, only annotations in the current file were checked.
  - **Source-context type resolution**: Target type IDs are resolved from the file where the annotation is defined, so consumers don't need to import the target types (e.g., using `<Sidebar>` with `@renders* {NavItem}` children works without importing `NavItem`).
  - **External render map resolution**: Imported component annotations (`@renders {NavItem}` on `NavLink`) now resolve their target type IDs from the source file's scope, fixing false positives in cross-file validation chains.

- [#11](https://github.com/HorusGoul/eslint-plugin-react-render-types/pull/11) [`d7bcc39`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/d7bcc39030d8e68b9f71428404d37dcc94902f27) Thanks [@HorusGoul](https://github.com/HorusGoul)! - @transparent annotations now work cross-file. Imported transparent components are automatically discovered via TypeScript's type checker, so settings configuration is only needed for components without JSDoc (e.g., React built-ins like Suspense).

- [#8](https://github.com/HorusGoul/eslint-plugin-react-render-types/pull/8) [`7df8c49`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/7df8c498f994f6ea8cb27124686d8c0027047d2b) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add expression extraction and `@renders!` unchecked flag

  - **Expression extraction**: The plugin now analyzes expressions inside transparent wrappers and return statements, including ternaries (`cond ? <A /> : <B />`), logical AND (`cond && <A />`), `.map()`/`.flatMap()` callbacks, and JSX fragment children.
  - **`@renders!` unchecked flag**: Skip return validation when the plugin can't statically analyze a return value. Composable with existing modifiers: `@renders!`, `@renders?!`, `@renders*!`. The component still declares its render type for chain resolution.

- [#5](https://github.com/HorusGoul/eslint-plugin-react-render-types/pull/5) [`0c8a02c`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/0c8a02c54afe51ad4b291e894040a782480f1213) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add union type support and type alias resolution for `@renders` annotations.

  **Union Types:** Use `@renders {Header | Footer}` to declare that a component may render any of the specified types. Union syntax works with all modifiers (`@renders?`, `@renders*`) and across all rules (`valid-render-return`, `valid-render-prop`, `renders-uses-vars`).

  **Type Alias Unions:** Reference a TypeScript type alias in `@renders` and the plugin resolves it at lint time. For example, `type LayoutSlot = Header | Footer` can be used as `@renders {LayoutSlot}`, and the plugin expands it to validate against `Header | Footer`.

## 0.4.0

### Minor Changes

- [#3](https://github.com/HorusGoul/eslint-plugin-react-render-types/pull/3) [`964d3b8`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/964d3b870005ff285599435346c15eda1b839cd8) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add `renders-uses-vars` rule to prevent no-unused-vars errors for @renders imports

  This rule marks components referenced in `@renders` annotations as "used", preventing ESLint's `no-unused-vars` from flagging imports that are only used in JSDoc annotations.

  ```tsx
  import { Header } from "./Header"; // No longer flagged as unused

  /** @renders {Header} */
  function MyHeader() {
    return <HeaderWrapper />;
  }
  ```

  The rule is enabled by default in the recommended config and works with all import styles including `import type { X }` and `import { type X }`.

## 0.3.0

### Minor Changes

- [`c7444dd`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/c7444ddeec4609f697ec1f3834a59050d346f3f9) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add `require-renders-annotation` rule to enforce @renders annotations on components

  This rule is disabled by default and is useful for enforcing render type annotations in specific folders, such as a design system or shared component library.

  Example configuration to enable for specific folders:

  ```javascript
  // eslint.config.js
  export default [
    reactRenderTypes.configs.recommended,
    {
      files: ["src/design-system/**/*.tsx"],
      rules: {
        "react-render-types/require-renders-annotation": "error",
      },
    },
  ];
  ```

- [#1](https://github.com/HorusGoul/eslint-plugin-react-render-types/pull/1) [`d2f870c`](https://github.com/HorusGoul/eslint-plugin-react-render-types/commit/d2f870c5b0ea10d66da20b05255a2466a141367f) Thanks [@HorusGoul](https://github.com/HorusGoul)! - Add `valid-renders-jsdoc` rule for JSDoc syntax validation and reference checking

  - Validates `@renders` annotation syntax (missing braces, lowercase names, empty braces)
  - Checks that referenced components are defined or imported in the file
  - Supports namespaced components like `@renders {Menu.Item}`

## 0.2.0

### Minor Changes

- Initial release of eslint-plugin-react-render-types.

  This ESLint plugin brings Flow's Render Types to TypeScript via JSDoc comments, allowing you to enforce component composition constraints at lint time.

  Features:

  - `@renders {Component}` - Component must render the specified type
  - `@renders? {Component}` - Component may render the type or nothing
  - `@renders* {Component}` - Component may render zero or more of the type
  - Chained rendering support across component boundaries
  - Props validation with `@renders` annotations
  - Cross-file resolution with typed linting enabled
