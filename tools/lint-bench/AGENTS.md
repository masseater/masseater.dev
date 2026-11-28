# lint-bench

This workspace measures y8, wism, fu4 and h56m against the linters they replace and other tools that do the same job: the time of cold and warm runs, the peak memory of the process tree, and the findings, with the overlap of findings where both sides use the same rules.

- `vp run bench` installs the tools in the `tools` section of `vite.config.ts` with `vpa --prepare`, installs the npm tools and checks out the corpora into `~/.cache/lint-bench`, outside the repository so that msch does not scan them, and writes `results/results.json` and `results/results.md`. `--family <name>` limits it to `markdown`, `structure`, `workflows` or `secrets`, and `--budget <seconds>` sets the time each case may spend on warm runs.
- The npm tools stay out of the pnpm lockfile, because steiger, typescript-eslint, dependency-cruiser and Sheriff pull in TypeScript 5. Their versions are pinned in `src/features/prepare-corpora/api/tools.ts`.
- The corpora are this repository at HEAD and nodejs/node at the commit in `src/features/prepare-corpora/api/corpora.ts`. The structure cases run in the repository itself, the others in a worktree there without `vite.config.ts`, so that each linter gets only the config of its case.
- Cold runs drop the page cache when `/proc/sys/vm/drop_caches` is writable and remove the tools' caches. Run nothing else on the machine while measuring.
- Set `OTEL_EXPORTER_OTLP_ENDPOINT` to send the spans of the four linters to a collector, and read them with `work-metrics lint`.
- Copy the tables into the README of each linter after a run.
