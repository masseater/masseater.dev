# @r_masseater/y8-presets

The official rule presets for the [y8](https://www.npmjs.com/package/@r_masseater/y8) Markdown linter, one preset per concern.

```sh
npm install -D @r_masseater/y8 @r_masseater/y8-presets effect
```

```ts
import "@r_masseater/y8/vite";
import { agentsMd, readme, recommended } from "@r_masseater/y8-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  y8: { extends: [readme(), agentsMd({ sections: [["Commands"], ["Rules"]] })] },
});
```

Pick the presets you want and list them in `extends`, or take every one with `recommended()`.

| Preset          | Rules                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| `documents`     | `docs/*`: link targets, forward slashes, local paths, emails, placeholders in every file |
| `readme`        | `readme/*`: the shape of `README.md`                                                     |
| `agentsMd`      | `agents-md/*`: the shape of `AGENTS.md` and `CLAUDE.md`, written in English              |
| `skillMd`       | `skill-md/*`: the shape of `skills/*/SKILL.md`                                           |
| `markdownStyle` | Settings for the built-in `markdownlint/*` rules                                         |
| `agentConfig`   | `agnix/*`: agent configuration checks built into y8                                      |

The rules use only the rule API of y8, so this package has no per-OS builds.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/y8-presets#<skill>`.
