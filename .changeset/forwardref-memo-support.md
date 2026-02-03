---
"eslint-plugin-react-render-types": minor
---

Support `@renders` and `@transparent` annotations on `forwardRef` and `memo` wrapped components. The plugin now recognizes patterns like `const Button = forwardRef((props, ref) => ...)` and `const Button = memo(() => ...)`, including nested wrappers like `memo(forwardRef(...))`.
