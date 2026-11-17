# @r_masseater/wism

![wism logo](logo.svg)

A structure and dependency linter for TypeScript, Rust and Markdown, written in Rust and
configured from `vite.config.ts`.

A marker file such as `package.json`, `Cargo.toml` or `SKILL.md` gives its directory a kind.
Each kind declares where files may sit and, optionally, the layers its source is split into.
wism then reads every import, `use` and Markdown link into one graph and checks it against
those layers, the way steiger checks Feature-Sliced Design.

```ts
import { definePlugin, defineRule, fsd, skill } from "@r_masseater/wism";
import "@r_masseater/wism/vite";
import { defineConfig } from "vite-plus";

const noSharedToApp = defineRule({
  meta: { description: "shared never links into app" },
  check: ({ edges, report }) => {
    for (const edge of edges) {
      if (edge.from.includes("/shared/") && edge.specifier.includes("/app/")) {
        report({ path: edge.from, line: edge.line, message: "points into app" });
      }
    }
  },
});

export default defineConfig({
  wism: {
    kinds: [...fsd({ paths: ["apps/*", "libs/*"] }), skill()],
    plugins: { local: definePlugin({ rules: { "no-shared-to-app": noSharedToApp } }) },
    rules: { "local/no-shared-to-app": "error", "link-target": "warn" },
    ignores: ["**/fixtures/**"],
  },
});
```

Run `wism` to check the files git tracks, or call `lint` from code.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/wism#<skill>`.
