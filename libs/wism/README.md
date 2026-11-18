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

## Comparison

Measured on 2026-11-18 on linux x64, 4 CPUs with [lint-bench](https://github.com/masseater/masseater.dev/tree/main/tools/lint-bench), which keeps the full results in [results.md](https://github.com/masseater/masseater.dev/blob/main/tools/lint-bench/results/results.md). Cold runs drop the page cache and the tools' caches first. "Same as ours", "Only ours" and "Only theirs" compare findings by file, line and rule where both tools use the same rules.

None of the tools finds a problem in this repository except steiger, whose recommended rules do not match the layout the repository uses. wism also checks file placement and Rust and Markdown imports, which the others do not.

#### masseater.dev

| Tool                     | Version                                      | Cold     | Warm            | Peak RSS | Findings | Same as ours | Only ours | Only theirs |
| ------------------------ | -------------------------------------------- | -------- | --------------- | -------- | -------- | ------------ | --------- | ----------- |
| ls-lint                  | 2.3.2                                        | 330 ms   | 143 ms ± 16 ms  | 58 MB    | 0        |              |           |             |
| **wism**                 | workspace                                    | 3.54 s   | 2.46 s ± 49 ms  | 460 MB   | 0        |              |           |             |
| dependency-cruiser       | 18.8.0                                       | 5.40 s   | 4.23 s ± 145 ms | 577 MB   | 0        |              |           |             |
| Sheriff                  | 0.20.0                                       | 44.84 s  | 44.92 s ± 0 ms  | 339 MB   | 0        |              |           |             |
| eslint-plugin-boundaries | 7.4.4 on ESLint 10.15.0                      | 69.17 s  | 71.13 s ± 0 ms  | 706 MB   | 0        |              |           |             |
| steiger                  | 0.10.0, @feature-sliced/steiger-plugin 0.8.2 | 286.24 s | 266.14 s ± 0 ms | 257 MB   | 382      |              |           |             |

- wism: The repository's own config: placement, FSD layers and imports of TS, Rust and Markdown
- dependency-cruiser: FSD layer imports in apps/_/src, libs/_/src and tools/*/src
- eslint-plugin-boundaries: FSD layer imports in apps/_/src, libs/_/src and tools/*/src
- Sheriff: FSD layer imports in apps/_/src, libs/_/src and tools/*/src, from every file in src/app
- steiger: FSD recommended rules, one run per src directory
- ls-lint: File and directory names in apps/_/src, libs/_/src and tools/*/src

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/wism#<skill>`.
