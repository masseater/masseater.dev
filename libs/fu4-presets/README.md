# @r_masseater/fu4-presets

The official rule presets for [fu4](https://www.npmjs.com/package/@r_masseater/fu4), the GitHub
Actions linter. fu4 ships only the engine, so a project turns on the presets it wants from this
package.

```sh
npm install -D @r_masseater/fu4 @r_masseater/fu4-presets effect
```

```ts
import "@r_masseater/fu4/vite";
import { actionlint, zizmor } from "@r_masseater/fu4-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fu4: {
    extends: [
      actionlint({ "self-hosted-runner": { labels: ["gpu"] } }),
      zizmor({ concerns: ["injection", "supply-chain", "references"], persona: "regular" }),
    ],
  },
});
```

List the presets you want in `extends`, or take both with `recommended()`. Every rule of a chosen
preset is an error. Override one in `rules`, such as `"zizmor/stale-action-refs": "warn"`.

| Preset       | Rules                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `actionlint` | `actionlint/*`: what [actionlint](https://github.com/rhysd/actionlint) reports, with its shellcheck checks |
| `zizmor`     | `zizmor/*`: the audits of [zizmor](https://github.com/zizmorcore/zizmor), with its findings and positions  |

`actionlint()` takes the options of actionlint's `actionlint.yaml`.

`zizmor()` takes these options.

| Option          | Meaning                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `concerns`      | `injection`, `supply-chain`, `references`, `credentials`, `workflow` and `config`; all by default |
| `persona`       | `regular`, `pedantic` or `auditor`, as zizmor's `--persona`                                       |
| `minSeverity`   | The lowest severity to report                                                                     |
| `minConfidence` | The lowest confidence to report                                                                   |
| `rules`         | The `rules` section of a zizmor config                                                            |
| `online`        | `false` skips the audits that query GitHub                                                        |
| `githubHost`    | The GitHub host to query, such as a GitHub Enterprise Server host; `github.com` by default        |

The audits that query GitHub read a token from `ZIZMOR_GITHUB_TOKEN`, `GH_TOKEN` or
`GITHUB_TOKEN`, in that order, and are skipped without one. They list a repository's branches and
tags through git's protocol, and list a public repository anonymously when GitHub rejects the token there.
Commits found to be reachable are remembered in
`node_modules/.cache/fu4/zizmor-reachable-commits.txt`, so later runs do not ask GitHub again.
zizmor's auto-fixes are not included.

The rules use only the rule API of fu4, so this package has no per-OS builds.
