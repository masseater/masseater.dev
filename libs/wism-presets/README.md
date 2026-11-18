# @r_masseater/wism-presets

The official rule presets for [wism](https://www.npmjs.com/package/@r_masseater/wism). wism ships
only the engine, so a project turns on the presets it wants from this package.

| Preset      | Rules                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ |
| `fsd`       | `layer-name`, `loose-file`, `layer-import`, `cross-slice`, `public-api`, `wildcard-export` |
| `placement` | `placement`                                                                                |
| `links`     | `link-target`                                                                              |

```sh
npm install -D @r_masseater/wism @r_masseater/wism-presets effect
```

```ts
import "@r_masseater/wism/vite";
import { rustCrate, skill, structure, workspace } from "@r_masseater/wism-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  wism: structure({
    kinds: [workspace({ paths: ["libs/*"] }), rustCrate(), skill()],
    presets: ["fsd", "placement", "links"],
  }),
});
```

`presets` defaults to all of them. Every rule of a chosen preset is an error, named
`structure/<rule>`. Override one with `rules`, such as `"structure/link-target": "warn"`.

The rules run in TypeScript on the import graph that the wism engine has read, so this package has
no per-OS builds.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/wism-presets#<skill>`.
