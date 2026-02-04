---
"eslint-plugin-react-render-types": patch
---

fix: validate children inside JSX fragments in `valid-render-prop` rule

Previously, components wrapped in JSX fragments (`<>...</>`) were silently skipped during children validation. This meant neither valid nor invalid children inside fragments were checked against `@renders` annotations. Now fragments are recursively unwrapped in both `validateJSXChildren` and `extractChildElementNames`.
