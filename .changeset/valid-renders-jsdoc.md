---
"eslint-plugin-react-render-types": minor
---

Add `valid-renders-jsdoc` rule for JSDoc syntax validation and reference checking

- Validates `@renders` annotation syntax (missing braces, lowercase names, empty braces)
- Checks that referenced components are defined or imported in the file
- Supports namespaced components like `@renders {Menu.Item}`
