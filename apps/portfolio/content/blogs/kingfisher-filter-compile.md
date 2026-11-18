---
title: "Why building h56m's detector took 3 seconds"
description: "A record of measuring that Kingfisher's kingfisher-rules compiled the Vectorscan databases for the Betterleaks filters every time, and of bringing watashi's tests from 214 seconds down to 5 seconds with an in-process cache."
tags: ["Rust", "Kingfisher", "Vectorscan", "シークレット検出"]
published: true
---

h56m is a secret detector written in Rust on top of kingfisher-rules and kingfisher-scanner from [Kingfisher](https://github.com/mongodb/kingfisher). It loads 474 rules from the Betterleaks preset from TOML. watashi, which sends Claude Code conversations to watashi-mcp, masks secrets with h56m before sending them.

## The breakdown of the 3 seconds

When I switched watashi to h56m, watashi's tests started timing out. The whole test file took 214 seconds. The tests built a new detector for each test, so I measured the time it takes to build one detector, stage by stage.

| Stage                                                                                                 | Time taken      |
| ----------------------------------------------------------------------------------------------------- | --------------- |
| Loading the main Vectorscan database from the disk cache and compiling the rules' regular expressions | 60 ms           |
| Compiling the Vectorscan databases for Betterleaks' `matchesAny` and `findMatch` filters              | About 3 seconds |

kingfisher-rules 3.2.1 saves the main Vectorscan database to `~/.cache/kingfisher/rule-cache` and reuses it on the next start[^kingfisher-rules-database]. The filter databases do not go into this cache, and `BetterleaksFilterEngine::compile_for_rules` compiles them again every time a detector is built[^kingfisher-betterleaks-filter]. Most of the 3 seconds was this compilation.

## Build it only once within the process

I made h56m keep the compiled rule databases in an in-process table. The key of the table is the rule settings. When a second detector is built with the same settings, it reuses the first one's databases. With this change, watashi's tests went from 214 seconds to 5 seconds ([#1319](https://github.com/masseater/masseater.dev/pull/1319)).

## The remaining 3 seconds

This cache disappears when the process ends. watashi runs as a Claude Code hook, and a hook starts a new process every time it is called, so each call pays the 3 seconds once. The filter databases are built inside kingfisher-rules, so h56m cannot remove this on its side. I wrote a request to Kingfisher to save the two filter databases in the same cache as the main one. If that goes in, even short-lived processes can start in about 60 ms, the same as with the main cache.

[^kingfisher-rules-database]: [kingfisher-rules 3.2.1 の src/rules_database.rs](https://docs.rs/crate/kingfisher-rules/3.2.1/source/src/rules_database.rs)

[^kingfisher-betterleaks-filter]: [kingfisher-rules 3.2.1 の src/betterleaks_filter.rs](https://docs.rs/crate/kingfisher-rules/3.2.1/source/src/betterleaks_filter.rs)
