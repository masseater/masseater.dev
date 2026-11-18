# @r_masseater/fu4-presets

This workspace holds the official fu4 rule presets: `actionlint` for actionlint's checks and `zizmor` for zizmor's audits, selectable per concern. It uses only the rule API of `@r_masseater/fu4`, so it ships as plain TypeScript with no native code.

The rules return the same results as actionlint and zizmor. The tests under `features/*/test/` compare them with fixtures and expected results taken from those tools; do not edit the expected results by hand. Audits that query GitHub are tested against a fake `fetch`, and must never reach GitHub from a test.
