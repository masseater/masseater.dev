# @r_masseater/wism

![wism logo](logo.svg)

The engine of a structure and dependency linter for TypeScript, Rust and Markdown, configured from
`vite.config.ts`.

A Rust addon reads every import, `use` path and Markdown link of the files git tracks into one
graph. Rules are TypeScript plugins that check that graph, so a rule package runs on every OS
without its own native build. `@r_masseater/wism-presets` holds the official presets.

```ts
import "@r_masseater/wism/vite";
import { definePlugin, defineRule } from "@r_masseater/wism";
import { skill, structure, workspace } from "@r_masseater/wism-presets";
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

const layout = structure({ kinds: [workspace({ paths: ["libs/*"] }), skill()] });

export default defineConfig({
  wism: {
    ...layout,
    plugins: {
      ...layout.plugins,
      local: definePlugin({ rules: { "no-shared-to-app": noSharedToApp } }),
    },
    rules: { ...layout.rules, "local/no-shared-to-app": "error" },
    ignores: ["**/fixtures/**"],
  },
});
```

Run `wism` to check the files git tracks, or call `lint` from code.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/wism#<skill>`.
