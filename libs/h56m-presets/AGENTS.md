# @r_masseater/h56m-presets

This workspace holds the rule presets for h56m. The h56m engine has no rules of its own, and projects extend one of these files.

- Keep this package free of native code so that it needs no per-OS builds. Anything that needs native code belongs in h56m.
- `vp run native` takes the presets out of the `kingfisher-rules` crate. The pre-commit hook and every task that reads the presets depend on it. Do not extract them in an install script: pnpm vendors the crates after all lifecycle scripts, so `cargo metadata` cannot run offline during install. Do not copy rule files into the repository, and do not commit the generated `presets/` directory.
- Each export is the absolute path of a TOML file in the Betterleaks format.
