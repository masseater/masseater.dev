# @r_masseater/i68

This workspace is the linter for `.fumx` songs. It reads each song with `@r_masseater/fumx-parser`, resolves the `i68` section of vite.config.ts, runs the rules of the configured plugins and applies `i68-ignore` comments. It holds no rules of its own; the official rules live in `@r_masseater/i68-presets`.

- The parser is TypeScript, so the engine is TypeScript with no native code. Move work to Rust only when OTel spans (`i68.read`, `i68.rules`, `i68.rule`) show TypeScript is too slow.
