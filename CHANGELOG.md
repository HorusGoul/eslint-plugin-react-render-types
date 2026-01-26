# eslint-plugin-react-render-types

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
