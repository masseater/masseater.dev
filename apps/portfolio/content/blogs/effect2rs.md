---
title: "effect2rs"
description: "effect2rs generates serde Rust types from Effect Schema, so a desktop app whose web side is TypeScript and whose native side is Rust keeps one definition of every type that crosses the boundary. With example output, the cases it refuses and the check that rejects hand-written copies."
tags: ["Effect", "Rust", "TypeScript", "Tauri"]
published: true
---

[effect2rs](https://github.com/masseater/masseater.dev/tree/main/libs/effect2rs) generates Rust types with serde derives from Effect Schema. My desktop apps are built with Tauri, which puts a TypeScript web side in front of a Rust process, and every message between the two had been typed twice: once as an Effect Schema and once as a Rust struct written by hand. effect2rs makes the Effect Schema the only definition and generates the Rust side from it. I built it for my own use, so it is not on npm.

## From an Effect Schema to a Rust module

effect2rs takes the exported values of a module and returns the text of one Rust module. A schema becomes a type when it has an `identifier` annotation, and a plain string, number or boolean exported next to the schemas becomes a constant.

```ts
import { effect2rs } from "@masseater.dev/effect2rs";
import { Effect, Schema } from "effect";

const Track = Schema.Struct({
  trackId: Schema.String,
  bpm: Schema.Number,
  bars: Schema.Int.check(Schema.isUint32()),
  key: Schema.optional(Schema.NullOr(Schema.String)),
}).annotate({ identifier: "Track" });

const Stem = Schema.Literals(["vocals", "drums", "bass", "other"]).annotate({ identifier: "Stem" });

const rust = await Effect.runPromise(
  effect2rs({ definitions: { Track, Stem, MAX_STEMS: 4 }, header: "// generated" }),
);
```

Running this on November 18, 2026 printed the following module.

```rust
// generated

use serde::{Deserialize, Serialize};

pub const MAX_STEMS: i64 = 4;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub track_id: String,
    pub bpm: f64,
    pub bars: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Stem {
    Vocals,
    Drums,
    Bass,
    Other,
}

impl Stem {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Vocals => "vocals",
            Self::Drums => "drums",
            Self::Bass => "bass",
            Self::Other => "other",
        }
    }

    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "vocals" => Some(Self::Vocals),
            "drums" => Some(Self::Drums),
            "bass" => Some(Self::Bass),
            "other" => Some(Self::Other),
            _ => None,
        }
    }
}
```

The field `bars` became `u32` because of the `isUint32` check, and `bpm` became `f64` because it has no integer check. `Eq` is derived for `Stem` and not for `Track`, because `Track` contains a float. The output is already in the form rustfmt would produce, so a formatting check never reports it.

## What becomes what

effect2rs reads Effect v4's own representation of a schema, `SchemaRepresentation`, instead of converting it to JSON Schema first. The identifiers and integer checks therefore reach the Rust side as they were written.

| Effect Schema                                           | Rust                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `Schema.Struct`                                         | A struct with snake_case fields, renamed back to the wire keys by serde |
| A union of string literals                              | An enum with `as_str` and `parse`                                       |
| A union of structs that share a literal tag             | An internally tagged enum                                               |
| An integer check such as `isInt` or `isUint32`          | `i32`, `u32`, `i64` or `u64`                                            |
| A number without an integer check                       | `f64`                                                                   |
| A transformation such as `Schema.DateTimeUtcFromString` | Its encoded side, here `String`                                         |
| A recursive reference                                   | A `Box`                                                                 |
| An exported string, number or boolean                   | `pub const`                                                             |

Rust keywords become raw identifiers. Names that cannot be raw identifiers get a suffix, and names that start with a digit get a prefix.

## Cases it refuses

effect2rs fails with `UnsupportedSchema` and the path of the schema instead of guessing. A struct nested inside another struct without its own `identifier` fails at `Track.meta`, because Rust needs a name for it. A union of a string and a number fails, and so does a union of number literals. Effect quietly renames a second schema with the same identifier to `Name_1`, so effect2rs reports that as an error too.

## A check rejects stale output and hand-written copies

`checkRust` compares each generated file with what the schemas generate now. It fails with `StaleRust` when the file is missing or different, and with `HandWrittenCopies` when another `.rs` file in the same directory declares a name that the generated file already declares. The second failure stops a Rust developer, or an AI, from writing a struct by hand next to the generated one.

## Differences between the two sides

A Cargo crate in the package round-trips encoded samples through serde and checks that Rust rejects every sample that Effect rejects. The remaining differences are known and accepted.

| Case                                      | Effect         | Rust                             |
| ----------------------------------------- | -------------- | -------------------------------- |
| A missing key for `NullOr`                | Rejected       | Accepted as `None`               |
| `null` for `optional(NullOr(...))`        | Kept as `null` | Serialized back as an absent key |
| Dates and other values encoded as strings | Validated      | Not validated                    |
| Unknown keys                              | Ignored        | Ignored                          |

## Where it fits with tauri-specta

The direction is the opposite of most existing tools. [specta](https://github.com/specta-rs/specta) and tauri-specta generate TypeScript from Rust types, and the JSON Schema route goes through tools such as [typify](https://github.com/oxidecomputer/typify). When I built effect2rs on November 15, 2026, I found no tool that generated Rust from Effect Schema. In my apps, tauri-specta still types the Tauri commands, and effect2rs generates the types those commands take and return. Four apps use it today, with 3 to 25 generated types each.
