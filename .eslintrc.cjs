/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
  },
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "**/state/comfortTool/*",
              "!**/state/comfortTool/types",
              "!**/state/comfortTool/createComfortToolState.svelte"
            ],
            message: "Directly importing internal state modules is restricted. Use the exposed controller interface.",
          },
          {
            group: [
              "**/services/comfort/*",
              "!**/services/comfort/referenceValues",
            ],
            message: "Directly importing internal services into UI components is restricted. Use the state controller.",
          }
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["src/state/**/*", "src/services/**/*", "src/models/**/*", "*.test.ts"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
  ],
};
