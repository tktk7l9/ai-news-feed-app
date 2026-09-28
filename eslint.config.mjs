import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react 7.x resolves `version: "detect"` through
    // context.getFilename(), which ESLint 10 removed; pin the major instead.
    settings: { react: { version: "19" } },
  },
  {
    // eslint-config-next parses plain JS with its bundled @babel/eslint-parser,
    // whose scope manager lacks addGlobals() and crashes under ESLint 10.
    // typescript-eslint's parser supports ESLint 10 and handles JS/JSX too.
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: { parser: tseslint.parser },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // OpenNext / wrangler build output (generated)
    ".open-next/**",
    ".wrangler/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
