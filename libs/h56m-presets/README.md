# @r_masseater/h56m-presets

Rule presets for the [h56m](https://www.npmjs.com/package/@r_masseater/h56m) secret scanner.
h56m ships no rules of its own, so a project extends one of these files.

| Export        | Rules                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `betterleaks` | The default configuration of [Betterleaks](https://github.com/betterleaks/betterleaks), taken from Kingfisher's archive |

```ts
import "@r_masseater/h56m/vite";
import { betterleaks } from "@r_masseater/h56m-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  h56m: { extend: { path: betterleaks, disabledRules: ["generic-api-key"] } },
});
```

Each export is the absolute path of a TOML file in the Betterleaks format. The files are plain data,
so this package has no per-OS builds.

The Betterleaks rules are under the MIT license. `THIRD-PARTY-NOTICES.txt` holds the notice.
