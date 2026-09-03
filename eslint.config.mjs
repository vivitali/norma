import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pulled Claude Design prototype — reference material, not app source.
    "design-reference/**",
    // Installed tooling, not app source. Left unlinted for the same reason
    // design-reference is: it is vendored code this repo does not author. It was
    // emitting 304 warnings on an otherwise clean tree, which destroys the
    // signal scripts/check exists to give.
    ".claude/skills/**",
    // Agent worktrees are nested INSIDE the checkout (.claude/worktrees/<id>/), so
    // `eslint .` from the root would lint every parallel branch's stale copy and
    // report its failures as this tree's. tsconfig and vitest exclude it too.
    ".claude/**",
    ".github/skills/**",
    ".github/agents/**",
  ]),
]);

export default eslintConfig;
