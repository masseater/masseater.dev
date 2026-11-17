# @r_masseater/wism-fsd

wism rules that keep TypeScript workspaces and Rust crates in Feature-Sliced Design layers, keep
files where their kind allows, and keep Markdown links pointing at tracked files.

```sh
npm install -D @r_masseater/wism @r_masseater/wism-fsd effect
```

```ts
import "@r_masseater/wism/vite";
import { fsdPreset, rustCrate, skill, workspace } from "@r_masseater/wism-fsd";
import { defineConfig } from "vite-plus";

export default defineConfig({
  wism: fsdPreset({ kinds: [workspace({ paths: ["libs/*"] }), rustCrate(), skill()] }),
});
```

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/wism-fsd#<skill>`.
