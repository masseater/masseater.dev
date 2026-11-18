---
title: "fallow: detecting unused code, duplication and boundary violations with one binary"
description: "The results of running fallow, an analysis tool written in Rust, to find unused files, exports and dependencies, duplicate code, and an audit that judges only the changes in a diff, plus the hook that stops AI agents from committing."
tags: ["fallow", "TypeScript", "静的解析"]
published: true
---

In a TypeScript project, the usual way to find files that are imported from nowhere, exports that are never used, and dependencies left in `package.json` but never imported has been to use [knip](https://knip.dev/). You needed separate tools for each purpose: [jscpd](https://github.com/kucherenko/jscpd) to detect copy-pasted functions, [stylelint](https://stylelint.io/) to check CSS, and so on. [fallow](https://fallow.tools/) is an analysis tool that puts these checks into a single binary written in Rust, and it uses [Oxc](https://oxc.rs/) for parsing[^fallow-readme]. Because it does not start a Node.js process, detecting unused code in the next.js monorepo (20,558 files) finishes in 2.95 seconds[^fallow-readme].

## What it can detect

| Command                               | What it detects                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `fallow dead-code`                    | Unused files, exports, types, class and enum members, and dependencies                |
| `fallow dupes`                        | Duplicate code in JS, TS, CSS, Vue, Svelte and Astro                                  |
| `fallow health`                       | Complexity hotspots and a health score from 0 to 100                                  |
| `fallow architecture`、`fallow guard` | Violations of the direction of dependencies between layers, and circular dependencies |
| `fallow security`                     | Security candidates ordered by reachability from entry points                         |
| `fallow audit`                        | A pass, warn or fail verdict that covers only the changed files                       |

Running `fallow` with no arguments runs the dead-code, dupes and complexity checks together[^fallow-readme].

## Example run

We try it with the following setup. The only entry point is `index.ts`, and `legacy.ts` is imported from nowhere. `price.ts` has unused exports, and `package.json` still lists lodash, which is not imported.

```ts
import { z } from "zod";

// src/index.ts
import { formatPrice } from "./price";

const Order = z.object({ total: z.number() });
export const main = () => console.log(formatPrice(Order.parse({ total: 100 }).total));
main();
```

```ts
// src/price.ts
export const formatPrice = (n: number) => `${n.toFixed(2)} JPY`;
export const formatPriceUsd = (n: number) => `${n.toFixed(2)} USD`;
export type Currency = "JPY" | "USD";
```

```json
// .fallowrc.json
{ "entry": ["src/index.ts"] }
```

Here is the unused code part of the output of `npx fallow`.

```text
● Unused files (1)
  src/legacy.ts
  Files not reachable from any entry point

● Unused exports (1)
  src/price.ts
    :2 formatPriceUsd

● Unused type exports (1)
  src/price.ts
    :3 Currency

● Unused dependencies (1)
  lodash
  Listed in dependencies but never imported

✗ 1 file · 1 export · 1 type · 1 unused dependency (0.07s)
```

The four kinds, files, exports, types and dependencies, are reported together in a single pass.

## Suppress code you want to keep, with a reason

If you do not want to delete an export you plan to use next month, put a comment on the line just before it.

```ts
// fallow-ignore-next-line unused-export -- 来月の USD 対応で使う
export const formatPriceUsd = (n: number) => `${n.toFixed(2)} USD`;
```

On the next run it is counted as `1 suppressed` and is removed from the violations. If the problem that was suppressed later disappears, the suppression comment itself is reported as a `stale suppression`[^fallow-readme]. You do not end up in a state where `eslint-disable` comments that no longer do anything are left lying around.

## Detecting duplication

We paste the same calculation into two files, change only the variable names, and run `fallow dupes`.

```text
● Duplicates (1 clone groups)

     12 lines  2 instances  dup:0b64f8f8
    src/a.ts:4-15
    src/b.ts:4-15

⚠ 24 lines (58.5%) duplicated across 2 files (0.01s)
```

The comparison is done by structure, not by identifier names, so a copy in which `Row` was rewritten to `Line` and `invoiceTotal` to `quoteTotal` is also reported as the same clone.

## An audit that judges only the changed parts

An existing codebase often already has hundreds of unused exports. You cannot keep CI red until all of them are fixed, so `fallow audit` checks only the files changed in the diff from the base branch, and the verdict depends only on the problems newly introduced by that change[^fallow-readme].

On a feature branch, we add `tax.ts`, use only `withTax` from it, and run the audit.

```text
$ fallow audit --base main
Audit scope: 2 changed files vs main (cf92e12..HEAD)

● Unused exports (2)
  src/tax.ts (2)
    :1 taxRate
    :3 withoutTax

✗ dead code: 2 issues · 2 changed files (0.08s)
```

`legacy.ts`, which was already in main, is not included in the report. If you want to fail on existing problems too, add `--gate all`[^fallow-readme].

## A hook that stops AI agents from committing

Running `fallow agent install` sets up hooks for whichever of Claude Code, Codex and Cursor it detects[^fallow-readme]. For [Claude Code](https://code.claude.com/docs/), it is registered as a PreToolUse hook. When the agent tries to run `git commit` or `git push`, `fallow audit` runs, and if the verdict is fail, the command is refused. The agent cannot commit until it fixes, on the spot, the unused exports it added.

## Analysis with type information

The default analysis is based on syntax alone. With `--type-aware`, the identity of TypeScript symbols is tracked across aliases, re-exports and package boundaries, so interface implementations and base class members are no longer wrongly judged as unused[^fallow-readme].

## Migrating from knip

Running `npx fallow migrate` reads existing knip, jscpd and stylelint settings and converts them into fallow settings[^fallow-readme].

[^fallow-readme]: fallow README. https://github.com/fallow-rs/fallow
