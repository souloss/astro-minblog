import eslintPluginAstro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { rules: { "no-console": "error" } },
  { files: ["tools/**", "functions/**"], rules: { "no-console": "off" } },
  { ignores: ["dist/**", ".astro/**", ".wrangler/**", "public/pagefind/**", "demo/dist/**", "demo/.astro/**", "packages/**/dist/**", "packages/**/.astro/**"] },
];
