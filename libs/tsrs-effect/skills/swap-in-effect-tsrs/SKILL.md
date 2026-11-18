---
name: swap-in-effect-tsrs
description: >
  Use when vp check or vp lint fails with "unknown rule: effecttsgo/..." because Vite+ bundles a
  tsrs version that @effect/tsgo does not ship an Effect build for: replacing the @tsrs platform
  packages through pnpm overrides, and removing the overrides once @effect/tsgo catches up.
metadata:
  type: core
  library: "@r_masseater/tsrs-effect"
  library_version: 7.1.0-beta.tsrs2.effect.0.70.0
sources:
  - README.md
  - package.json
---

# swap-in-effect-tsrs

Vite+ runs type-aware lint and type checks with the tsrs binary from `@tsrs/<platform>`. `effecttsgo/*` rules work only in a tsrs binary built with the Effect language service. `@effect/tsgo` ships that build only for the tsrs version on npm's `latest` tag, so a newer tsrs bundled by Vite+ fails with `unknown rule: effecttsgo/...`.

This package's platform packages hold the same files as `@tsrs/<platform>`, with the binary built from the same tsrs tag plus Effect's patches.

## Setup

Pick the version whose first part matches the tsrs version Vite+ bundles. `7.1.0-beta.tsrs2.effect.0.70.0` is tsrs `7.1.0-beta.tsrs2` with `@effect/tsgo` 0.70.0. Check the bundled one with `vp exec tsrs --version`.

In `pnpm-workspace.yaml`, with `<version>` set to that version:

```yaml
overrides:
  "@tsrs/linux-x64-gnu": npm:@r_masseater/tsrs-effect-linux-x64-gnu@<version>
  "@tsrs/win32-x64-msvc": npm:@r_masseater/tsrs-effect-win32-x64-msvc@<version>
```

Run `vp install`. Keep `effect-tsgo patch --oxlint` in `prepare`; it adds the `effecttsgo` plugin to Oxlint's config types. Drop the `effect-tsgo --tsrs-lint` prefix from `vp check`.

## Removing it

When `@effect/tsgo` publishes an Effect build of the tsrs version Vite+ bundles, delete both overrides and run `effect-tsgo patch --tsrs` instead.

## Common mistakes

- Overriding only one platform. Every platform that runs `vp check` needs its override; other platforms fall back to the plain tsrs and fail on `effecttsgo` rules.
- Using a version built for a different tsrs. The binary must match the tsrs version of the launcher Vite+ installs.
- Removing `effect-tsgo patch --oxlint`. The Oxlint config then fails to type-check on `effecttsgo` rules.
