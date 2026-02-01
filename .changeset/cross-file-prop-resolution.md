---
"eslint-plugin-react-render-types": minor
---

Add cross-file prop annotation resolution for `valid-render-prop`

- **Cross-file `@renders` on props**: The rule now resolves `@renders` annotations on props defined in external files. Previously, only annotations in the current file were checked.
- **Source-context type resolution**: Target type IDs are resolved from the file where the annotation is defined, so consumers don't need to import the target types (e.g., using `<Sidebar>` with `@renders* {NavItem}` children works without importing `NavItem`).
- **External render map resolution**: Imported component annotations (`@renders {NavItem}` on `NavLink`) now resolve their target type IDs from the source file's scope, fixing false positives in cross-file validation chains.
