# @r_masseater/fu4

A GitHub Actions workflow linter written in Rust and configured from `vite.config.ts`.

It reports what [actionlint](https://github.com/rhysd/actionlint) reports, with the same
messages and positions, except for its pyflakes integration. Instead of running shellcheck,
it checks `run:` scripts itself with tree-sitter-bash for the most common shellcheck findings.
It also accepts the `$/` self repository reference in `uses:`, which actionlint 1.7.12 rejects.
Its knowledge of
contexts, events, permissions, runners and popular actions is generated from GitHub's docs and
schemas.

```ts
import "@r_masseater/fu4/vite";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fu4: {
    selfHostedRunner: { labels: ["gpu"] },
    configVariables: ["DEPLOY_TARGET"],
    paths: {
      ".github/workflows/release.yml": { ignore: ['^input "token" is not defined'] },
    },
    ignores: [".github/workflows/vendored-*.yml"],
  },
});
```

Run `fu4` to lint the workflows under `.github/workflows`, or pass pathspecs to lint others.
Call `lint` to lint from code.
