---
title: "What goes wrong in a huge monorepo (as of November 27, 2026)"
description: "masseater.dev holds almost everything the owner builds. This note lists what has hurt: the 10 GB Actions cache limit, the memory of a 16 GB cloud session, a verify that stays slow even when sharded, and similar-code detection that stops at the repository border."
tags: ["monorepo", "CI", "Cloudflare"]
published: true
---

masseater.dev is the monorepo that holds almost everything the owner builds. This note collects what has hurt so far, with the numbers measured on November 27. Earlier notes cover single causes in detail: [the CI cache](/slog/monorepo-ci-cache), [why CI got slow](/slog/monorepo-ci-slowness) and [the size of the repository](/slog/monorepo-size).

## The Actions cache is shared by everything

GitHub Actions keeps 10 GB of cache per repository and evicts the least recently used entries beyond that. The repository reached 10.3 GB on November 25. Right after the daily prune it still sits at 6.5 GB, and three things fill it:

| What            | Size                   | Why it grows                                        |
| --------------- | ---------------------- | --------------------------------------------------- |
| pnpm store      | 2.1 GB                 | A new copy is saved every time the lockfile changes |
| Vite Task cache | about 0.75 GB per push | Each of the 6 verify shards saves its own           |
| sccache entries | about 3,700            | The prune cannot reach them                         |

Restoring is not free either. Extracting the cache takes about 60 seconds per job, and the time is spent decompressing, not downloading, so a faster network does not help.

## A cloud session cannot run the checks in parallel

A cloud session has 16 GB of RAM, about 14.3 GB of it usable, and no swap. Single steps already take a large share of that. The three processes inside `vp check` peak at 7.2, 3.2 and 2.4 GB, and the step as a whole peaks at about 10.5 GB.

| Step                                    | Peak memory   |
| --------------------------------------- | ------------- |
| `vp check` (whole step)                 | about 10.5 GB |
| `vp check`: tsgolint                    | 7.2 GB        |
| `vp check`: `tsc --api` for typed rules | 3.2 GB        |
| `vp check`: oxlint                      | 2.4 GB        |
| msch                                    | 6.4 GB        |
| tests                                   | 4 GB          |

Cargo, fallow and Chrome run out of memory when they start next to these. The answer was to run one thing at a time, which makes a cold verify take about 20 minutes. The pre-push hook runs the same verify, so every push pays that price.

Typed lint builds one TypeScript program for the whole repository. Its memory therefore grows with the number of packages.

## Sharding does not make verify fast

In CI, verify still takes about 15 minutes even though it runs in 6 shards. Cutting the work into more pieces has not brought that number down.

## Similar code is only visible inside one repository

Splitting a repository hides code that should have been shared, because the similar-code check compares functions inside one repository. With [fallow similar-code](/slog/fallow-similar-code) a cross-repository check has to be built on purpose. fallow stops at 1,414 functions per run, so the comparison has to be sharded.

This is the strongest argument for keeping things together. A wrong split cannot be noticed from inside either half.

## What this means for splitting

The default is one repository. A part is split out only when two conditions hold: keeping it together gives nothing, because it is stable and shares nothing with its neighbours, and the costs above actually bite it. Being easy to fork can be one reason among others, but it is not enough alone. Where a split is made, a periodic cross-repository similar-code check is the safeguard that makes a wrong split visible.
