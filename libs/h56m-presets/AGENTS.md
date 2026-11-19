# @r_masseater/h56m-presets

This workspace holds the rule presets for h56m. The h56m engine has no rules of its own, and projects extend one of these files.

- Keep this package free of native code so that it needs no per-OS builds. Anything that needs native code belongs in h56m.
- `vp run native` copies the presets out of the `betterleaks` dev dependency, which pins a commit of the Betterleaks repository on GitHub. The pre-commit hook and every task that reads the presets depend on it. Do not copy rule files into the repository, and do not commit the generated `presets/` directory.
- Each export is the absolute path of a TOML file in the Betterleaks format.
- `src/app/fixtures/` holds the tests of every Betterleaks rule, recorded from the pinned commit. Do not edit them by hand; `src/app/fixtures/README.md` says how to record them again.
