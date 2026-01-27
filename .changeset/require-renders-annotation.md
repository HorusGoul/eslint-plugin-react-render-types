---
"eslint-plugin-react-render-types": minor
---

Add `require-renders-annotation` rule to enforce @renders annotations on components

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
