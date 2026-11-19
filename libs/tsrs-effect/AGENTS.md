# @masseater.dev/tsrs-effect

This workspace builds tsrs with the Effect language service for the tsrs version Vite+ bundles, while `@effect/tsgo` does not ship that version.

- Delete this workspace and the root `run.check` option once `@effect/tsgo` ships the tsrs version Vite+ bundles.
- Bump `upstream.effect` and `upstream.tsrs` in `package.json` together. Keep a patch in `patches/` only while Effect's patch of the same name does not apply.
