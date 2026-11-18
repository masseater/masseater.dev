# @r_masseater/h56m-presets

This workspace holds the rule presets for h56m. The h56m engine has no rules of its own, and projects extend one of these files.

- Keep this package free of native code so that it needs no per-OS builds. Anything that needs native code belongs in h56m.
- The `prepare` script, which runs on `vp install`, and `vp run native` take the presets out of dependencies. Do not copy rule files into the repository, and do not commit the generated `presets/` directory.
- Each export is the absolute path of a TOML file in the Betterleaks format.
