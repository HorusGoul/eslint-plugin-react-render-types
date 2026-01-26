import tseslint from "typescript-eslint";
import reactRenderTypesModule from "eslint-plugin-react-render-types";

// Handle CommonJS/ESM interop - the default export is nested
const reactRenderTypes = reactRenderTypesModule.default || reactRenderTypesModule;

export default tseslint.config(
  ...tseslint.configs.recommended,
  reactRenderTypes.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ["eslint.config.js"],
  }
);
