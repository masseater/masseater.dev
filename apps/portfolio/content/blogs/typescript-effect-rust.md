---
title: "TypeScript, Effect and Rust"
description: "I write everything in TypeScript with Effect and move a part to Rust only when measurements call for it. Effect Schema is the one definition of the types both languages share, and OpenTelemetry joins both into one trace."
tags: ["TypeScript", "Effect", "Rust", "OpenTelemetry"]
published: true
---

My repositories use two languages, TypeScript and Rust. Everything starts in TypeScript written with Effect, and a part moves to Rust only when a measurement shows that TypeScript is too slow or a native library is the only way to do the job. C# appears only inside Unity, and I do not use Python at all. The two languages share one definition of every type and report into one trace, so the boundary between them costs me little.

## Claude writes TypeScript with Effect by default

Most of my code is written by Claude, and TypeScript with Effect is where its mistakes are easiest to catch. Effect puts failures and dependencies into the type, and effect-tsgo turns a wrong use of Effect into a type error. I adopt it everywhere, small scripts included, and I wrote the reasons in [AIにコードを書かせるならEffectを全面採用する](/blogs/effect-for-ai). The apps, the Workers, the CLIs and the lint rules all start here.

## Rust is where the numbers or the libraries are

A part moves to Rust for one of two reasons. The first is speed that I have measured. My linters parse in Rust: y8 lints the 267 Markdown files of my monorepo in 28 ms, against 70 ms for rumdl. Their rules, though, stay in TypeScript and run on the syntax tree that the Rust engine hands over through shared memory. A rule moves to Rust only when its spans show TypeScript is too slow, and for fu4 I had every rule ported from Rust to TypeScript, keeping only parsing in the engine.

The second reason is work that has no good library in TypeScript. My song manager separates a track into stems with a BS-RoFormer model on candle, Hugging Face's machine learning framework for Rust, and writes 24-bit FLAC files. The desktop apps run on Tauri, so their native side is Rust by design. For the linters I build one native addon per engine, with no addon or WebAssembly module per rule.

| Part                                 | Language               | Reason                                        |
| ------------------------------------ | ---------------------- | --------------------------------------------- |
| Apps, Workers, CLIs, lint rules      | TypeScript with Effect | Default                                       |
| Linter engines (y8, fu4, h56m, wism) | Rust                   | Parsing speed measured against existing tools |
| Stem separation, audio download      | Rust                   | Model inference and audio codecs              |
| Native side of desktop apps          | Rust                   | Tauri                                         |

## Types are defined once, in Effect Schema

A type that crosses between the two languages is defined only as an Effect Schema. The Rust structs and enums are generated from it by [effect2rs](/blogs/effect2rs), and a check fails when someone writes one of them by hand next to the generated file. Before effect2rs, the protocol of my first desktop app was written twice, and every change had to be made in both copies.

The direction is from TypeScript to Rust because the schema on the TypeScript side also validates. It decodes the messages that arrive from Rust, so a mismatch between the two sides shows up as a decode error at the boundary rather than as a wrong value later.

## One trace covers both languages

When TypeScript calls a Rust engine, the Rust side reports its spans under the caller's trace. The Effect span passes its `traceparent` to the native addon, and the addon exports its spans over OTLP when the call finishes. A slow lint run therefore shows up as one trace, with the spans of the TypeScript side and of the Rust engine side by side. Without that trace, I could not tell which part to move to Rust, and the rule in the first section would be a guess.

## The TypeScript toolchain itself now runs on Rust

Even the TypeScript side is checked by Rust. In October 2026, Cloudflare and VoidZero announced tsrs, a port of the TypeScript 7 compiler to Rust, inside the Oxc project[^cloudflare-tsrs]. From Vite+ 1.7.0, type checking and type-aware lint in `vp check` run on tsrs, and I switched my monorepo on November 17. On 4,242 files with 4 cores, `vp check` went from 193 to 212 seconds and 10.8 GiB of memory to 100 to 108 seconds and at most 7.7 GiB.

[^cloudflare-tsrs]: [Introducing tsrs: a Port of TypeScript to Rust, The Cloudflare Blog](https://blog.cloudflare.com/typescript-rust-port/)
