# @r_masseater/vitest-otlp

This workspace is a Vitest plugin. It receives the telemetry code sends during tests so tests can check what was actually sent.

- Assume only Vite+ and Node.js 26 or later. Make `vite-plus` a peer dependency and add no branches for other environments.
- Regenerate the protobuf code with `vp run generate`. Do not edit it by hand.
- When you change this package or its recommendations, also update the `measure-everything` skill in masseater/skills.
