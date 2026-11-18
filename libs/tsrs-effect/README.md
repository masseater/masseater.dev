# @r_masseater/tsrs-effect

[tsrs](https://github.com/oxc-project/tsrs), the Rust port of TypeScript 7, built with the [Effect language service](https://github.com/Effect-TS/tsgo), for a tsrs version that `@effect/tsgo` does not ship yet.

`@effect/tsgo` ships Effect-patched tsrs builds only for the tsrs version on npm's `latest` tag. Vite+ bundles a newer tsrs, so `vp check` and `vp lint` run a tsrs that does not know the Effect rules. This package builds the Effect-patched tsrs for the tsrs version Vite+ bundles.

## Use

Replace the tsrs platform packages with the ones from this package in `pnpm-workspace.yaml`:

```yaml
overrides:
  "@tsrs/linux-x64-gnu": npm:@r_masseater/tsrs-effect-linux-x64-gnu@7.1.0-beta.tsrs2.effect.0.70.0
  "@tsrs/win32-x64-msvc": npm:@r_masseater/tsrs-effect-win32-x64-msvc@7.1.0-beta.tsrs2.effect.0.70.0
```

Then `vp check` and `vp lint` report the `effecttsgo` rules without `effect-tsgo --tsrs-lint`. Keep `effect-tsgo patch --oxlint`, which adds the `effecttsgo` plugin to Oxlint.

## What is built

The version names both upstreams: `7.1.0-beta.tsrs2.effect.0.70.0` is tsrs `7.1.0-beta.tsrs2` with `@effect/tsgo` 0.70.0.

`bin/build.ts` clones Effect-TS/tsgo and tsrs at the tags in `package.json` (`upstream`), applies Effect's tsrs patches in order, replaces a patch with the one of the same name in `patches/` where Effect's no longer applies, skips the patches listed in `upstream.skip`, and builds the `tsrs` binary with `cargo build --release`. Each platform package holds that binary and the files of the matching `@tsrs` platform package.

Only Linux x64 (glibc) and Windows x64 are built.

## License

tsrs is Apache-2.0 and the Effect language service is MIT. Their license files are in each platform package.
