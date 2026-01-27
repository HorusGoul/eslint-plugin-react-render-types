---
"eslint-plugin-react-render-types": minor
---

Add `renders-uses-vars` rule to prevent no-unused-vars errors for @renders imports

This rule marks components referenced in `@renders` annotations as "used", preventing ESLint's `no-unused-vars` from flagging imports that are only used in JSDoc annotations.

```tsx
import { Header } from './Header';  // No longer flagged as unused

/** @renders {Header} */
function MyHeader() {
  return <HeaderWrapper />;
}
```

The rule is enabled by default in the recommended config and works with all import styles including `import type { X }` and `import { type X }`.
