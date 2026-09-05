import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    // Nested agent worktrees (.claude/worktrees/<id>/) carry their own test files;
    // without this, `vitest run` from the root runs every parallel branch's suite too.
    exclude: ["**/node_modules/**", ".claude/**"],
    setupFiles: ["./vitest.setup.ts"],
    server: { deps: { inline: [/next-intl/] } },
  },
});
