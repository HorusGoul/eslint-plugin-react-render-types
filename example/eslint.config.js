import tseslint from "typescript-eslint";
import reactRenderTypes from "eslint-plugin-react-render-types";

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
    settings: {
      "react-render-types": {
        additionalTransparentComponents: ["Suspense"],
      },
    },
  },
  { ignores: ["eslint.config.js", "vite.config.ts"] },
);
