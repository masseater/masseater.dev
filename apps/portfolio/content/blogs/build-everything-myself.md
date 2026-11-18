---
title: "Rebuilding tools that already exist"
description: "I am having Claude rebuild linters and checkers that already exist, such as y8 for markdownlint, fu4 for actionlint and zizmor, h56m for secret scanners and msch for my repository rules. Owning them lets me fix what bothers me at once and keep every setting and measurement in one place."
tags: ["Linter", "Rust", "Vite+", "Claude"]
published: true
---

I am having Claude rebuild, one after another, tools that already exist and work well. y8 is a Markdown linter in place of markdownlint, fu4 is a GitHub Actions linter in place of actionlint and zizmor, h56m is a secret scanner in place of Betterleaks and secretlint, and msch gathers the checks of all my repositories into one command. On November 7, I put the reason this way: "I don't want to be tied to other people's OSS update flows; I want to build everything myself and fix it right away when something bothers me." What I want is a place where an AI can pull every measurement by itself, and borrowed tools keep getting in the way of that.

| Tool                                                                   | Replaces                                           | Built on                                    | Gives the same results as                   |
| ---------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| [y8](https://github.com/masseater/masseater.dev/tree/main/libs/y8)     | markdownlint, rumdl                                | pulldown-cmark                              | markdownlint MD001 to MD060                 |
| [fu4](https://github.com/masseater/masseater.dev/tree/main/libs/fu4)   | actionlint, zizmor                                 | zizmor's published crates, tree-sitter-bash | actionlint and zizmor's offline audits      |
| [h56m](https://github.com/masseater/masseater.dev/tree/main/libs/h56m) | Betterleaks, secretlint                            | Kingfisher's matching engine                | Betterleaks rules, read in their own format |
| [msch](https://github.com/masseater/masseater.dev/tree/main/libs/msch) | per-repository scripts and rules written in skills | the tools above and oxlint                  | none; the rules are mine                    |

## Bending my code to fit a library cost more than writing one

My rule is still the usual one: do not build or wrap things without a reason, and look for an existing library before writing anything new. On November 15, I added one exception: "If forcing a general library into its general usage lowers efficiency, that defeats the purpose, so I now allow myself to build my own library tailored to my use case."

The cost I mean showed up in every tool I replaced. markdownlint, actionlint and Betterleaks each read their own configuration file in their own format, while every other setting in my repositories lives in one `vite.config.ts`. actionlint ships as a Go binary, so it cannot report spans into the same trace as the TypeScript that calls it. When GitHub added the `uses: $/path` syntax that refers to the repository itself, actionlint 1.7.12 rejected it, and the only fix on my side was to wait for a release or stop using the syntax.

## The original tool's tests become the specification

A rebuild is affordable now because Claude writes the code and the original tool already defines what correct means. Every tool here vendors the test data of the tool it replaces and must give the same answers before it ships. y8 matches all 53 rules of markdownlint 0.42.1 on its 436 fixtures. fu4 reports actionlint's findings with the same messages and positions, and its port of zizmor's 43 security audits matches all 278 snapshot cases of zizmor 1.32.0.

Matching the original first and changing it second keeps my changes deliberate. fu4 differs from actionlint in one place that I chose: it accepts `uses: $/path`, which my workflows use. y8 differs in speed. On the 267 Markdown files of my monorepo, y8 lints in 28 ms against 70 ms for rumdl, which is already a Rust rewrite of markdownlint.

## I borrow the cores and build the surface

I do not rebuild parsers or matching engines that follow a specification. y8 parses with pulldown-cmark, fu4 runs zizmor's audits on zizmor's own crates, and h56m matches secrets with Kingfisher's engine. What I build is the part I touch: the configuration section in `vite.config.ts`, the command, the diagnostics, the spans and the rules.

The rules are split from the engines in the same way. Each engine is a Rust package built per operating system, and its rules ship in one TypeScript package named `<engine>-presets`, from which a repository picks presets per concern. The engine hands its syntax tree to the TypeScript rules over shared memory, and a rule moves to Rust only when the measured numbers show TypeScript is too slow.

## msch turns my corrections into checks

msch is the place where these tools meet my own rules. It runs every check of a repository from one command and is part of `vp run verify`, which every push runs. When I correct Claude for the same mistake twice, such as a comment explaining code or a wrapper function that only forwards its arguments, the correction becomes a msch check instead of a sentence in a skill. Since then, Claude meets the rule as a failing check rather than as text it may skip.

Because I own every tool msch runs, a new check never waits on anyone else. When a rule needs a fix in y8 or fu4, the same thread changes the tool and the repository in one PR.
