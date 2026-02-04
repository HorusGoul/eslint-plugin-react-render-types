---
"eslint-plugin-react-render-types": patch
---

Fix @renders annotation resolution through barrel/re-export imports. Components imported via barrel files (e.g., `export { X } from "./X"`) now correctly resolve their render chain for validation.
