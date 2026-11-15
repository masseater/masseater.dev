---
name: share-types-with-rust
description: >
  Use when TypeScript and Rust in this repository exchange data: a Tauri app talking to its web
  side, a Rust process reading JSON that TypeScript writes, or any Rust struct, enum, or constant
  that mirrors a TypeScript type. Covers defining the types as Effect Schema, generating the serde
  Rust with @masseater.dev/effect2rs through tools/protocol-codegen, the checkRust freshness and
  hand-written copy check, and the wire differences that stay between the two sides. Also use when
  codegen:check reports a stale file or a hand-written copy.
metadata:
  purpose: >
    Keep one source of truth for every type that crosses the TypeScript and Rust boundary, so the
    Rust side is always generated from Effect Schema and never drifts or gets copied by hand.
  type: core
  library: "@masseater.dev/effect2rs"
  library_version: 0.0.0
sources:
  - src/**
  - conformance/**
  - ../../tools/protocol-codegen/src/**
---

# Share types with Rust

Effect Schema is the source of truth. Rust never declares a type that crosses the boundary. It imports the module that effect2rs generates.

## Add or change a shared type

Define the type as an Effect Schema in the app's `libs/<app>-protocol` package.
Give every struct, enum, and alias an `identifier` annotation.
effect2rs refuses an anonymous nested struct and reports its path.

Export the schema from a module that `tools/protocol-codegen/src/rust.ts` already passes as `definitions`.
The codegen spreads whole modules into `definitions`, so a new export is generated without touching it.
Do not pick names one by one, because a name you forget is never generated.

A new app needs its own `RustOutput` in `rustOutputs`.
Set `derive` to `specta::Type` for tauri-specta and add `schemars::JsonSchema` when Rust needs a JSON Schema.

Run `vp run codegen` in `tools/protocol-codegen`.
Commit the generated `protocol.rs` together with the schema change.
Rust code declares `pub mod protocol;` and imports from `crate::protocol`.

Tauri command signatures stay on tauri-specta. effect2rs produces the types the commands take and return.

## What the check catches

`vp run codegen:check` runs `checkRust` on every output as part of `verify`.
It fails with `StaleRust` when the file is missing or differs from what the schemas generate now.
Run `vp run codegen` again to fix it.

It fails with `HandWrittenCopies` when another `.rs` file in the output's directory declares a generated name.
Delete that struct, enum, alias, or constant and import the generated item instead.
Never edit `protocol.rs` to silence either error, because the next generation overwrites it.

## What becomes what

Struct keys become snake_case fields, and serde renames them back to the wire key.
Rust keywords become raw identifiers.
Names that cannot be raw, empty names, and leading digits get a suffix or a prefix.
Non-ASCII letters are dropped from the Rust name while the wire key stays the same.

A union of string literals becomes an enum with `as_str` and `parse`.
A union of structs sharing a literal tag becomes an internally tagged enum.
effect2rs refuses unions of number literals and unions that mix kinds.

Integer checks pick a 32-bit or 64-bit Rust integer, and other numbers become `f64`.
With `specta::Type`, 64-bit integers reach TypeScript as `number` and `Schema.Unknown` as `unknown`.
A transformation generates its encoded side, so `Schema.DateTimeUtcFromString` becomes `String`.
Plain strings, numbers, and booleans exported next to the schemas become `pub const`.
Recursive references are boxed, and `Eq` is derived only where no float is reachable.
The output is already formatted the way rustfmt formats it.

## Differences that remain

The cargo crate in `conformance/` round-trips encoded samples through serde.
It also checks that Rust rejects every sample that Effect rejects.
Some gaps are known and accepted.
serde accepts a missing key for an `Option` field, while Effect requires a `NullOr` key to be present.
`optional(NullOr(...))` serializes `None` as an absent key, so a `null` from TypeScript comes back absent.
Rust does not validate dates or other string-encoded values.
Both sides ignore unknown keys.
specta needs its `serde_json` feature when a type contains `Schema.Unknown`.

When a schema needs something effect2rs does not support, extend effect2rs instead of writing the type by hand.
Add a case to its tests and to the conformance samples at the same time.
