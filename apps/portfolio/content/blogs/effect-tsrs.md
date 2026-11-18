---
title: "Who is making Effect work on tsrs"
description: "Effect's language service runs on tsrs, the Rust port of TypeScript 7, four days after tsrs was announced. The Effect maintainer ported 58,000 lines of Go to Rust with AI agents, keeps the Go code as the specification, and carries 33 patches against tsrs because tsrs has no plugin API yet."
tags: ["Effect", "TypeScript", "tsrs", "Rust"]
published: true
---

masseater.dev type-checks with [tsrs](https://github.com/oxc-project/tsrs), the Rust port of TypeScript 7, and most of its code is written with [Effect](https://effect.website/). That only works because Effect's diagnostics, such as `floatingEffect` (an Effect that is created and never run), run inside tsrs. I wanted to know who made that happen and how, so I read the repositories, issues and pull requests up to November 18, 2026.

## The starting point: tsrs has no plugin API

Cloudflare announced tsrs on [October 20, 2026](https://blog.cloudflare.com/typescript-rust-port/). It lives in the Oxc organization, VoidZero develops and maintains it, and Cloudflare and Max Schwenk of Owner.com work on it too. It ports typescript-go function by function and keeps the Go names in snake_case.

Effect's diagnostics never ran inside TypeScript itself. The Effect language service ships as [`@effect/tsgo`](https://github.com/Effect-TS/tsgo), which patches the typescript-go binary and adds Effect's checker hooks, diagnostics, quick fixes, refactors and completions. tsrs has no language-service plugin hook, so a project that moved to tsrs lost all of that.

On the same day, a user opened [Effect-TS/tsgo#883](https://github.com/Effect-TS/tsgo/issues/883) asking whether tsrs could become a patch target. The issue notes that tsrs does not accept outside pull requests, so an extension point would have to come from the tsrs maintainers. Mattia Manzati, who maintains the Effect language service, answered on October 21 that there was "no clear plan yet but neither excluded yet".

## Four days later: a 1:1 port to Rust

On October 24 Mattia merged [#901](https://github.com/Effect-TS/tsgo/pull/901), "Additionally support TSRS for the Effect LSP". It ports all 2,332 in-scope Go declarations of the Effect language service to Rust crates, one crate per Go package and one `.rs` file per `.go` file, in Go's order. The plan in [`porting/TSRS_PORT.md`](https://github.com/Effect-TS/tsgo/blob/main/porting/TSRS_PORT.md) puts the size at about 58,000 lines of Go and 139 rules. The repository now holds about 126,000 lines of Rust under `crates/`.

The port was done with AI agents. The commit carries a Claude Code co-author trailer, and the repository has agent skills for porting and an `AGENTS.md` with coding standards for rule work.

What makes the port hold up is how it is kept in line with the Go code:

- The Go code is the specification. The Go build stays the default, and the Rust build is opt-in.
- A pull request that changes ported Go code must update the Rust port in the same pull request. `repoctl tsrs port-check` fails CI otherwise.
- Both builds run against the same baseline files. Any difference fails CI.
- The Rust build is compared with a Go build at the TypeScript version that tsrs pins, so a difference is a port bug unless the Go build shows it too.

Because tsrs has no hooks, Effect carries [33 patches](https://github.com/Effect-TS/tsgo/tree/main/_patches/tsrs) against it. Each one ports the typescript-go patch with the same number, plus patches that only make tsrs internals visible to the Effect crates. A bot bumps tsrs and rebases the patches.

## How fast it moved after that

- October 26: `effect-tsgo tsrs` runs the Effect-patched tsrs without touching `node_modules`, and the release build uses tsrs's own PGO and BOLT pipeline.
- November 3: [#999](https://github.com/Effect-TS/tsgo/pull/999) runs Oxlint's type-aware rules, including the Effect ones, on `tsrs --lint`, tsrs's port of tsgolint. It replaced an experiment ([#945](https://github.com/Effect-TS/tsgo/pull/945)) that had needed an unreleased tsrs branch.
- November 11: [#1032](https://github.com/Effect-TS/tsgo/pull/1032) stopped `--tsrs-lint --type-check` from reporting Effect suggestions as errors, a day after a user reported it.

From October 20 to November 17 the repository received 121 commits and 31 releases, about one release a day. Of the commits, 65 are Mattia's and 55 come from the bot that bumps upstreams and publishes versions. New rules keep landing in both the Go and the Rust code, often several a day.

## Who else is involved

This is mostly one maintainer with agents and automation. Others contribute at the edges:

- Users report and fix problems. One reported the CLI proxy cutting off piped tsrs output after 64 KiB on macOS. Another sent checker fixes for conditional and indexed-access types to the Effect patch set, because tsrs does not take them directly.
- Users measured the result. In #883, one reported a full build at 92 CPU seconds and 3.7 GB with tsrs, against 378 seconds and 7.9 GB with the patched typescript-go. Another saw wall time, CPU and memory at about a third of TypeScript 7.1.
- Others built around it: [effect-tsrs](https://github.com/yielded-dev/effect-tsrs), an independent Rust port of the diagnostics as a CLI, and a [Zed extension](https://github.com/NoksLabs/effect-tsrs-lsp) that uses the Effect-patched tsrs as its language server.

On the tsrs side, Boshen of VoidZero opened [oxc-project/tsrs#834](https://github.com/oxc-project/tsrs/issues/834), "Support Effect diagnostics", on October 28. It names Effect's tsrs patches as the starting point. The triage bot marked it "not actionable", as outside TypeScript parity, and the comments end with the two teams arranging to talk on Discord. Nothing about a plugin API or upstreaming has been announced since.

## What this means for a project like mine

The support is real and fast-moving, but it rides on patches to a fast-moving compiler, and it shows at the seams.

tsrs switched to TypeScript-aligned versions on November 12 ([#973](https://github.com/oxc-project/tsrs/pull/973)). The first one published to npm, `7.1.0-beta.tsrs2`, went out on November 16 under the `next` tag, so `latest` still points to `0.25.0-ts7.1.0-beta`. Effect's upstream bot follows `latest`, so `@effect/tsgo` still ships only the 0.25.0 build, while Vite+ 1.7.0 bundles `tsrs2`. masseater.dev therefore runs its checks through `effect-tsgo --tsrs-lint vp check`, which brings Effect's 0.25.0 build, instead of the tsrs that Vite+ ships.

While checking this I also found that every Effect finding was reported twice: once by the type check through the `@effect/language-service` plugin, and once by the `effecttsgo/*` lint rules. Effect's [Oxlint guide](https://github.com/Effect-TS/tsgo/blob/main/docs/README.md) recommends `"diagnostics": false` on the plugin for this case. masseater.dev now sets it, and msch, my check tool, reports any tsconfig that leaves it on.

The whole check of the repository went from 193–212 seconds with tsgolint to about 70 seconds on tsrs, Effect rules included. For now, I would rather depend on one maintainer and a strict parity policy than wait for a plugin API, and I will follow #834 for the day the rules move into tsrs itself.
