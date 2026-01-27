# eslint-plugin-react-render-types

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
