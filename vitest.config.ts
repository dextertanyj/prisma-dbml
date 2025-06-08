import { fileURLToPath } from "url";

import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    exclude: [...configDefaults.exclude],
    alias: {
      "~/": fileURLToPath(new URL("./src/", import.meta.url)),
    },
    coverage: {
      reporter: ["text", "lcov", "html"],
      exclude: ["**/*.spec.ts", "**/*.fixtures.ts"],
    },
  },
});