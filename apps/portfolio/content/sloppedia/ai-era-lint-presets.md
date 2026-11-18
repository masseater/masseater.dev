---
title: "Lint presets for the AI era"
description: "A survey of lint rule presets that ban shortcuts coding agents often take, as of November 18, 2026."
tags: ["静的解析", "ソフトウェア開発", "大規模言語モデル", "2026年のソフトウェア"]
published: true
infobox:
  - label: "Surveyed on"
    value: "November 18, 2026"
  - label: "Main engines"
    value: "Oxlint, ESLint, Biome, textlint, Vale"
  - label: "Typical examples"
    value: "landmines, anti-slop, eslint-plugin-vibe-proof, agnix"
---

Lint presets for the AI era are lint rule sets that assume coding agents write much of a repository. Human teams never wrote some rules down, because nobody would break them. Agents break them often, because they optimize for passing checks. For example, an agent mocks the code under test. It retries a flaky test until it passes. It adds `eslint-disable` to get a green check. These presets turn such habits into lint errors. This article lists the presets that exist as of November 18, 2026.

Most of these presets do not look for text that "sounds like AI". They look for cheap shortcuts that reviewers used to catch by eye. When agents write most of the code, a rule is the only reviewer that reads every line. landmines says that agents "optimise for green checks"[^landmines]. eslint-plugin-vibe-proof says that agents forget skills after the context is compacted. It argues that a deterministic linter is the feedback loop that remains[^vibe-proof]. agent-slop-lint says that old defaults assume a human who writes about 100 lines a day[^agent-slop-lint].

## Common traits

The error message tells the agent how to fix the problem. landmines, enforced-architecture and @shadcn/lint all write messages this way[^landmines][^enforced-architecture][^shadcn-lint]. The agent can then fix the problem without reading other files.

Many presets allow existing violations but only let their number go down. landmines takes an exact count of allowed violations for each file[^landmines]. It reports a file that has fewer violations than its count, so the list only shrinks. agent-lint keeps a baseline file in the repository, and the `agent-lint ratchet` command only tightens it[^agent-lint].

The presets also ban the ways around a rule. eslint-plugin-vibe-proof bans `eslint-disable` comments that give no reason[^vibe-proof]. Suppress Ratchet counts the suppression comments that a pull request adds[^suppress-ratchet].

Some presets are shipped as code to copy instead of as packages. anti-slop has no npm package[^anti-slop]. Users copy its rules into their repository with an agent skill. enforced-architecture is a catalog that an agent reads and adapts to another stack[^enforced-architecture].

Most new presets run on Oxlint. Several of them run without changes on ESLint, Oxlint and rslint[^no-comment-slop][^ai-guard].

## Code

The table below lists the code presets. The star counts were taken on November 18, 2026.

| Preset                                                                                     | Engine                      | Rules       | License    | Created    | Stars |
| ------------------------------------------------------------------------------------------ | --------------------------- | ----------- | ---------- | ---------- | ----- |
| [landmines](https://github.com/interfere-inc/landmines)                                    | Oxlint                      | 10          | MIT        | 2026-10-28 | 277   |
| [eslint-plugin-ai-guard](https://github.com/ai-guard-dev/eslint-plugin-ai-guard)           | ESLint, Oxlint              | 27          | MIT        | 2026-04-08 | 20    |
| [agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)                            | ruff, mypy, ESLint, semgrep | AL201-AL302 | MIT        | 2026-10-23 | 0     |
| [Suppress Ratchet](https://github.com/motchalini-llc/suppress-ratchet)                     | GitHub Actions              | -           | -          | -          | -     |
| [anti-slop](https://github.com/dmmulroy/anti-slop)                                         | Oxlint                      | 18 + 5      | MIT        | 2026-08-12 | 6,159 |
| [biome-anti-slop](https://github.com/arberbr/biome-anti-slop)                              | Biome                       | 18 + 5      | MIT        | 2026-11-02 | 0     |
| [oxlint-anti-slop](https://github.com/emilioSp/oxlint-anti-slop)                           | Oxlint                      | 11          | MIT        | 2026-09-30 | 1     |
| [oxc-config-ai-guardrails](https://github.com/matteoantoci/oxc-config-ai-guardrails)       | Oxlint                      | 59 + 16 + 4 | MIT        | 2026-07-31 | 0     |
| [eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)             | ESLint                      | -           | MIT        | 2026-07-26 | 15    |
| [eslint-plugin-llm-core](https://github.com/pertrai1/eslint-plugin-llm-core)               | ESLint                      | -           | MIT        | 2026-04-01 | 14    |
| [eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop) | ESLint, Oxlint, rslint      | 12          | MIT        | 2026-07-30 | 13    |
| [windbag](https://github.com/scale-venture-partners/windbag)                               | CLI                         | 6           | MIT        | 2026-08-05 | 26    |
| [enforced-architecture](https://github.com/GLips/enforced-architecture)                    | Oxlint                      | 67          | -          | 2026-02-19 | 11    |
| [agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)                           | CLI                         | 25          | Apache-2.0 | 2026-04-11 | 44    |
| [KarpeSlop](https://github.com/CodeDeficient/KarpeSlop)                                    | CLI                         | -           | MIT        | 2025-11-29 | 39    |
| [oxlint-plugin-complexity](https://github.com/itaymendel/oxlint-plugin-complexity)         | Oxlint                      | 1           | MIT        | 2025-12-25 | 52    |
| [@shadcn/lint](https://github.com/shadcn-ui/lint)                                          | ESLint, Oxlint              | -           | MIT        | 2026-09-02 | 3,368 |
| [renderlint](https://github.com/ngocanhnckh/renderlint)                                    | CLI                         | -           | MIT        | 2026-10-25 | 639   |

### Tests

landmines is a set of Oxlint plugins from Interfere[^landmines]. Its testing plugin bans mocks of the code under test with `no-test-doubles`. It also bans fixed sleeps with `no-fixed-sleep`. `no-flake-masking` bans test retries and raised timeouts. `strict-msw` requires MSW to fail on requests that no handler covers. Other plugins ban prose comments and set rules for test file names and their places. It needs Oxlint 1.81 or later. Some users report that `no-test-doubles` also bans fakes of outside services[^landmines-adoption].

eslint-plugin-ai-guard has 27 ESLint rules in 4 presets[^ai-guard]. Its CLI command `ai-guard integrity` finds changes that weaken checks. Examples are new suppressions, skipped tests and lower coverage settings. It also blocks npm package names that do not exist or that look like typosquats. Its CI checks that all 27 rules give the same results on Oxlint.

agent-lint runs the linters that a project already uses[^agent-lint]. It compares their findings with a baseline and fails on new ones. It also compares the change with a git base. It reports added suppressions, skipped tests, deleted tests and tests whose assertions were removed. It also reports linter settings that were loosened.

The Ratchet family is three GitHub Actions without dependencies[^suppress-ratchet]. Type Ratchet blocks new `any` types. Test Ratchet blocks `it.skip` and `.only`. Suppress Ratchet blocks new `eslint-disable` and `biome-ignore` comments.

### Types

anti-slop is a set of Oxlint rules by Dillon Mulroy[^anti-slop]. Its rules reject type assertions that have no evidence. They also reject `unknown` and `object` in function contracts. Five more rules apply to Effect code. They require `Match` and tagged constructors instead of manual `_tag` checks. biome-anti-slop ports the same rules to Biome plugins[^biome-anti-slop]. Its author warns that the Biome plugin API can change in patch releases. oxlint-anti-slop is a separate set of 11 Oxlint rules with similar goals[^oxlint-anti-slop].

oxc-config-ai-guardrails adds no rules of its own[^ai-guardrails]. It sets strict limits with the rules that Oxlint already has. A file may have 200 lines, and a function may have 50 lines. A function may take 3 parameters, and blocks may nest only 1 level deep.

### Idioms and comments

eslint-plugin-vibe-proof targets slow or long idioms that agents repeat[^vibe-proof]. One example is a `.filter()` call followed by `.map()`. Another is a regular expression that is created on every call. Its 4 presets do not overlap, so users can combine them. eslint-plugin-llm-core adds an MCP server that gives rule guidance to agents[^llm-core].

eslint-plugin-no-comment-slop has 12 rules for comments[^no-comment-slop]. `no-jargon` flags words such as "robust" and "seamlessly". `no-banner-comment` flags decorative dividers. windbag is a pre-commit linter written in Rust[^windbag]. It flags comments that narrate a change instead of the current code. Its rules find ticket numbers, past behavior and hedging words.

### Structure

enforced-architecture is a catalog of rules in 11 categories[^enforced-architecture]. The largest categories are boundaries, types and placement. It targets TanStack Start, Drizzle and Oxlint. Its README asks agents to rewrite the rules for other stacks.

agent-slop-lint checks code in many languages with 25 rules[^agent-slop-lint]. The rules measure complexity, duplication and magic numbers. Others find names that repeat the name of their class. KarpeSlop gives TypeScript code a score on three axes, noise, lies and soul[^karpeslop]. It checks imports against the npm registry to find packages that do not exist. oxlint-plugin-complexity adds cyclomatic and cognitive complexity to Oxlint[^complexity].

### User interfaces

@shadcn/lint checks how components in a Tailwind design system are styled[^shadcn-lint]. Users declare which classes each component accepts. The error message then suggests a size or variant from their own components. renderlint opens each page in a browser at several widths[^renderlint]. It reports clipped text, low contrast and overlapping elements.

## Prose and Markdown

| Preset                                                                                            | Engine   | Language | License | Created    | Stars |
| ------------------------------------------------------------------------------------------------- | -------- | -------- | ------- | ---------- | ----- |
| [textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing) | textlint | ja       | MIT     | 2025-06-16 | 1,164 |
| [textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)     | textlint | ja       | MIT     | 2026-09-12 | 131   |
| [slopless](https://github.com/berelevant-ai/slopless)                                             | textlint | en       | MIT     | 2026-05-16 | 342   |
| [vale-llm-slop](https://github.com/Syntaf/vale-llm-slop)                                          | Vale     | en       | -       | 2026-07-31 | 31    |
| [seiso](https://github.com/scarletkc/seiso)                                                       | CLI      | -        | MIT     | 2026-09-27 | 196   |

textlint-rule-preset-ai-writing finds structures that are common in Japanese text written by AI[^ai-writing]. Examples are bold list headings and colons. Its rule is to limit structure, not wording. textlint-rule-preset-ai-words-ja finds words that are common in such text with morphological analysis[^ai-words-ja]. Many of them are verbs translated word for word from English.

slopless checks English Markdown[^slopless]. Its rules find phrases such as "let me be honest" and "at the end of the day". vale-llm-slop has two Vale styles[^vale-llm-slop]. `Slop` flags buzzwords and empty praise. `STE` applies rules based on the ASD-STE100 standard for simple technical English.

seiso sets one convention for Markdown documents in a repository[^seiso]. Each document declares one kind, such as a how-to or a reference. Each fact has one home. A page that lives long must not record values that change often, such as versions.

## Agent configuration

| Preset                                                     | Targets                                    | License         | Created    | Stars |
| ---------------------------------------------------------- | ------------------------------------------ | --------------- | ---------- | ----- |
| [agnix](https://github.com/agent-sh/agnix)                 | CLAUDE.md, AGENTS.md, SKILL.md, hooks, MCP | MIT, Apache-2.0 | 2026-01-30 | 487   |
| [ctxlint](https://github.com/YawLabs/ctxlint)              | CLAUDE.md, AGENTS.md, MCP                  | MIT             | 2026-04-05 | 12    |
| [driftlint](https://github.com/alifurkangokce/driftlint)   | CLAUDE.md, AGENTS.md, SKILL.md             | MIT             | 2026-08-11 | 61    |
| [agents-lint](https://github.com/giacomo/agents-lint)      | CLAUDE.md, AGENTS.md, MEMORY.md            | -               | 2026-02-27 | 16    |
| [skill-check](https://github.com/thedaviddias/skill-check) | SKILL.md                                   | MIT             | 2026-02-20 | 194   |
| [LintLang](https://github.com/hermes-labs-ai/lintlang)     | MCP                                        | Apache-2.0      | 2026-02-28 | 147   |

agnix is a linter and language server for agent configuration[^agnix]. ctxlint, driftlint and agents-lint check context files against the code[^ctxlint][^driftlint][^agents-lint]. They report paths that no longer exist and commands that no longer work. ctxlint also counts the tokens that the files use. skill-check gives each `SKILL.md` file a score from 0 to 100[^skill-check]. LintLang checks tool descriptions and system prompts[^lintlang]. For example, it reports two tools whose descriptions do not tell a model which one to use.

## Related projects that are not lint rules

Some well-known projects against "AI slop" are agent skills or prompts. stop-ai-slop is a skill that asks an agent to remove slop from code and documents[^stop-ai-slop]. It calls itself a partner to linters. stop-slop and no-ai-slop are skills for prose, with 19,031 and 13,601 stars. These skills run inside a model, so their results can differ from run to run.

alint looks like ESLint, but a language model runs its rules[^alint]. Ultracite is a preset for Oxlint, Biome and ESLint that needs no configuration[^ultracite]. It presents itself as a linter for agentic development.

## Trends in 2026

Most of these projects are new. More than a third of the projects above were created in or after August 2026. landmines, renderlint, agent-lint and biome-anti-slop appeared in October and November. JS plugins for Oxlint made it cheap to publish rules without Rust.

The rules now check evidence as well as wording. Prose rules still list words such as "delve". Code rules check whether a test runs the real code. They check whether a type assertion has a reason. Configuration rules check whether a context file matches the code. None of these checks needs a model, so they can run on every edit.

## Use in masseater.dev

masseater.dev runs its checks through msch. Its own linters are y8 for Markdown, wism for structure, fu4 for GitHub Actions and h56m for secrets. Some ideas above are already covered. msch bans code comments, and y8 runs agnix as a built-in plugin.

msch could take the testing rules of landmines and the type rules of anti-slop. It could also ban suppression comments without a reason, as eslint-plugin-vibe-proof does. A check that a pull request does not loosen lint or test settings would also fit msch. ai-guard and agent-lint have such checks.

wism-presets could take the landmines rules for the names and places of test files. y8-presets could check that paths and commands in `AGENTS.md` exist, as ctxlint and driftlint do. It could also take the seiso rule that each fact has one home. The own Japanese textlint preset could take the structure rules of textlint-rule-preset-ai-writing. fu4-presets could check that a workflow change does not remove a lint or test step.

## Related articles

- [Oxlint](/sloppedia/oxlint)
- [fallow](/sloppedia/fallow)
- [Module boundary tools](/sloppedia/module-boundary-tools)
- [AI slop](/sloppedia/ai-slop)

[^landmines]: interfere-inc, "[landmines](https://github.com/interfere-inc/landmines)". Accessed November 18, 2026.

[^landmines-adoption]: K-Mistele, "[feat: enable four @interfere/landmines testing rules](https://github.com/K-Mistele/anti-slop/pull/9)". Accessed November 18, 2026.

[^vibe-proof]: SukkaW, "[eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)". Accessed November 18, 2026.

[^agent-slop-lint]: JordanGunn, "[agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)". Accessed November 18, 2026.

[^enforced-architecture]: GLips, "[enforced-architecture](https://github.com/GLips/enforced-architecture)". Accessed November 18, 2026.

[^shadcn-lint]: shadcn-ui, "[@shadcn/lint](https://github.com/shadcn-ui/lint)". Accessed November 18, 2026.

[^agent-lint]: MartinCastroAlvarez, "[agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)". Accessed November 18, 2026.

[^suppress-ratchet]: motchalini-llc, "[Suppress Ratchet](https://github.com/motchalini-llc/suppress-ratchet)". Accessed November 18, 2026.

[^anti-slop]: dmmulroy, "[anti-slop](https://github.com/dmmulroy/anti-slop)". Accessed November 18, 2026.

[^no-comment-slop]: jantimon, "[eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop)". Accessed November 18, 2026.

[^ai-guard]: ai-guard-dev, "[eslint-plugin-ai-guard](https://github.com/ai-guard-dev/eslint-plugin-ai-guard)". Accessed November 18, 2026.

[^biome-anti-slop]: arberbr, "[biome-anti-slop](https://github.com/arberbr/biome-anti-slop)". Accessed November 18, 2026.

[^oxlint-anti-slop]: emilioSp, "[oxlint-anti-slop](https://github.com/emilioSp/oxlint-anti-slop)". Accessed November 18, 2026.

[^ai-guardrails]: matteoantoci, "[oxc-config-ai-guardrails](https://github.com/matteoantoci/oxc-config-ai-guardrails)". Accessed November 18, 2026.

[^llm-core]: pertrai1, "[eslint-plugin-llm-core](https://github.com/pertrai1/eslint-plugin-llm-core)". Accessed November 18, 2026.

[^windbag]: scale-venture-partners, "[windbag](https://github.com/scale-venture-partners/windbag)". Accessed November 18, 2026.

[^karpeslop]: CodeDeficient, "[KarpeSlop](https://github.com/CodeDeficient/KarpeSlop)". Accessed November 18, 2026.

[^complexity]: itaymendel, "[oxlint-plugin-complexity](https://github.com/itaymendel/oxlint-plugin-complexity)". Accessed November 18, 2026.

[^renderlint]: ngocanhnckh, "[renderlint](https://github.com/ngocanhnckh/renderlint)". Accessed November 18, 2026.

[^ai-writing]: textlint-ja, "[textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing)". Accessed November 18, 2026.

[^ai-words-ja]: p1ass, "[textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)". Accessed November 18, 2026.

[^slopless]: berelevant-ai, "[slopless](https://github.com/berelevant-ai/slopless)". Accessed November 18, 2026.

[^vale-llm-slop]: Syntaf, "[vale-llm-slop](https://github.com/Syntaf/vale-llm-slop)". Accessed November 18, 2026.

[^seiso]: scarletkc, "[seiso](https://github.com/scarletkc/seiso)". Accessed November 18, 2026.

[^agnix]: agent-sh, "[agnix](https://github.com/agent-sh/agnix)". Accessed November 18, 2026.

[^ctxlint]: YawLabs, "[ctxlint](https://github.com/YawLabs/ctxlint)". Accessed November 18, 2026.

[^driftlint]: alifurkangokce, "[driftlint](https://github.com/alifurkangokce/driftlint)". Accessed November 18, 2026.

[^agents-lint]: giacomo, "[agents-lint](https://github.com/giacomo/agents-lint)". Accessed November 18, 2026.

[^skill-check]: thedaviddias, "[skill-check](https://github.com/thedaviddias/skill-check)". Accessed November 18, 2026.

[^lintlang]: hermes-labs-ai, "[LintLang](https://github.com/hermes-labs-ai/lintlang)". Accessed November 18, 2026.

[^stop-ai-slop]: kirankunapuli, "[stop-ai-slop](https://github.com/kirankunapuli/stop-ai-slop)". Accessed November 18, 2026.

[^alint]: alint-dev, "[alint](https://github.com/alint-dev/alint)". Accessed November 18, 2026.

[^ultracite]: Ultracite, "[Ultracite](https://www.ultracite.ai/)". Accessed November 18, 2026.
