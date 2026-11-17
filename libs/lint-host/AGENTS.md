# @masseater.dev/lint-host

This workspace holds the parts that run linters written in Rust (y8 and wism) from Node.js: building and loading the napi addon, the CLI that reads the vite.config.ts settings and the files git tracks, parsing rule settings, and passing traces along.

- Do not put anything that differs per linter here (rules, diagnostic shapes, settings contents). Keep it in each linter.
