---
title: "Lint presets for the AI era"
description: "A catalog of about 230 lint rule sets and checkers that ban shortcuts coding agents often take, as of November 18, 2026."
tags: ["静的解析", "ソフトウェア開発", "大規模言語モデル", "2026年のソフトウェア"]
published: true
infobox:
  - label: "Surveyed on"
    value: "November 18, 2026"
  - label: "Entries"
    value: "About 230"
  - label: "Main engines"
    value: "Oxlint, ESLint, Biome, textlint, Vale"
---

Lint presets for the AI era are lint rule sets that assume coding agents write much of a repository. Human teams never wrote some rules down, because nobody would break them. Agents break them often, because they optimize for passing checks. For example, an agent mocks the code under test. It retries a flaky test until it passes. It adds `eslint-disable` to get a green check. These presets turn such habits into lint errors. This article lists the presets that exist as of November 18, 2026.

Most of these presets do not look for text that "sounds like AI". They look for cheap shortcuts that reviewers used to catch by eye. When agents write most of the code, a rule is the only reviewer that reads every line. landmines says that agents "optimise for green checks"[^landmines]. eslint-plugin-vibe-proof says that agents forget skills after the context is compacted. It argues that a deterministic linter is the feedback loop that remains[^vibe-proof]. agent-slop-lint says that old defaults assume a human who writes about 100 lines a day[^agent-slop-lint].

## Method

The survey searched GitHub repositories and the npm registry on November 18, 2026. The GitHub search used about 40 queries, such as "slop lint", "agentic linter" and "agents.md linter". It covered repositories created since January 2025 with at least 5 stars. The npm search used about 30 queries and keywords, such as `oxlint-plugin`, `ai-slop` and `textlint-rule-preset`. The two searches returned about 800 candidates.

The catalog keeps tools that check code, text or configuration with fixed rules. It leaves out agent skills and prompts that only ask a model to write better. It also leaves out detectors that guess whether a model wrote a text. Tools that run their rules through a model are listed in a separate section. Star counts and weekly npm downloads are the values on November 18, 2026. A dash means that the value is not known.

The catalog has about 230 entries. About 200 are in the tables below. About 25 are copies or bundles of anti-slop, and 7 run their rules through a model.

## Common traits

The error message tells the agent how to fix the problem. landmines, enforced-architecture and @shadcn/lint all write messages this way[^landmines][^enforced-architecture][^shadcn-lint]. The agent can then fix the problem without reading other files.

Many presets allow existing violations but only let their number go down. landmines takes an exact count of allowed violations for each file[^landmines]. agent-lint keeps a baseline file in the repository, and its `ratchet` command only tightens it[^agent-lint].

The presets also ban the ways around a rule. eslint-plugin-vibe-proof bans `eslint-disable` comments that give no reason[^vibe-proof]. Suppress Ratchet counts the suppression comments that a pull request adds[^suppress-ratchet].

Some presets are shipped as code to copy instead of as packages. anti-slop has no npm package of its own[^anti-slop]. Users copy its rules into their repository with an agent skill.

## Tests and weakened checks

These tools stop an agent from making a check pass without fixing the code. landmines bans mocks of the code under test, fixed sleeps and test retries[^landmines]. Other tools compare a change with its base. They report deleted tests, removed assertions, new suppression comments and loosened settings. agent-lint and the Ratchet actions work this way[^agent-lint][^suppress-ratchet].

| Name                                                                             | Engine         | Created    | License    | Stars | Weekly npm downloads |
| -------------------------------------------------------------------------------- | -------------- | ---------- | ---------- | ----- | -------------------- |
| [landmines](https://github.com/interfere-inc/landmines)                          | Oxlint         | 2026-10-28 | MIT        | 311   | -                    |
| [procoder](https://github.com/azrtydxb/procoder)                                 | CLI            | 2026-08-16 | Apache-2.0 | 212   | -                    |
| [repopilot](https://github.com/MykytaStel/repopilot)                             | CLI            | 2026-05-01 | Apache-2.0 | 24    | -                    |
| [eslint-plugin-ai-guard](https://github.com/ai-guard-dev/eslint-plugin-ai-guard) | ESLint, Oxlint | 2026-04-08 | MIT        | 20    | -                    |
| [slopbrake](https://github.com/GreyforgeLabs/slopbrake)                          | CLI            | 2026-09-26 | MIT        | 14    | -                    |
| [deployproof](https://github.com/SVSPraveen/deployproof)                         | CLI            | 2026-08-27 | MIT        | 13    | -                    |
| [red-green-mode](https://github.com/hidevinliu/red-green-mode)                   | CLI            | 2026-08-01 | MIT        | 11    | -                    |
| [agent-roast](https://github.com/Nari-Ab/agent-roast)                            | CLI            | 2026-10-04 | MIT        | 11    | -                    |
| [dxkit](https://github.com/vyuh-labs/dxkit)                                      | CLI            | 2026-04-06 | MIT        | 10    | -                    |
| [ward-ai](https://github.com/RicardoRB/ward-ai)                                  | CLI            | 2026-10-08 | Apache-2.0 | 10    | -                    |
| [hadome](https://github.com/rerorets/hadome)                                     | CLI            | 2026-11-03 | MIT        | 5     | -                    |
| [Synapse-Hub](https://github.com/TeeVee98/Synapse-Hub)                           | CLI            | 2026-10-29 | -          | 2     | -                    |
| [slopsieve](https://github.com/princejain756/slopsieve)                          | CLI            | 2026-10-15 | MIT        | 0     | 36                   |
| [diffslop](https://github.com/AdilSiddiquiHQ/diffslop)                           | CLI            | 2026-10-29 | MIT        | 0     | 35                   |
| [agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)                  | CLI            | 2026-10-23 | MIT        | 0     | -                    |
| [suppress-ratchet](https://github.com/motchalini-llc/suppress-ratchet)           | GitHub Actions | 2026-07-01 | MIT        | 0     | -                    |

## Types and evidence

anti-slop is a set of Oxlint rules by Dillon Mulroy[^anti-slop]. Its rules reject type assertions that have no evidence. They also reject `unknown` and `object` in function contracts. Other projects in this group port these rules to Biome, ESLint or Python. Some add rules for Effect.

| Name                                                                                      | Engine         | Created    | License | Stars | Weekly npm downloads |
| ----------------------------------------------------------------------------------------- | -------------- | ---------- | ------- | ----- | -------------------- |
| [anti-slop](https://github.com/dmmulroy/anti-slop)                                        | Oxlint         | 2026-08-12 | MIT     | 6,164 | -                    |
| [ai-deslop](https://github.com/maharshi365/deslop)                                        | Oxlint         | 2026-09-13 | -       | 72    | 13,223               |
| [anti-slop-py](https://github.com/TinyFrontier/anti-slop-py)                              | Python         | 2026-08-23 | MIT     | 10    | -                    |
| [anti-slop-py](https://github.com/infoslack/anti-slop-py)                                 | Python         | 2026-08-22 | MIT     | 7     | -                    |
| [oxslop](https://github.com/Romariin/oxslop)                                              | Oxlint         | 2026-09-22 | -       | 2     | 495                  |
| [oxlint-plugin-solzero](https://github.com/SolZeroAI/oxlint-plugin-solzero)               | Oxlint         | 2026-10-27 | MIT     | 1     | 732                  |
| [@jliocsar/begone-slop](https://github.com/jliocsar/begone-slop)                          | Oxlint         | 2026-08-13 | -       | 1     | 409                  |
| [oxlint-anti-slop](https://github.com/emilioSp/oxlint-anti-slop)                          | Oxlint         | 2026-09-30 | MIT     | 1     | -                    |
| [@aranlucas/oxforge](https://github.com/aranlucas/oxforge)                                | Oxlint         | 2026-10-13 | MIT     | 0     | 528                  |
| [@yousufrasheed/eslint-plugin-antislop](https://github.com/YousufRasheed/eslint-antislop) | ESLint         | 2026-08-18 | MIT     | 0     | 268                  |
| [biome-anti-slop](https://github.com/arberbr/biome-anti-slop)                             | Biome          | 2026-11-02 | MIT     | 0     | -                    |
| [@seanmozeik/de-clank](https://www.npmjs.com/package/@seanmozeik/de-clank)                | Oxlint         | -          | -       | -     | 4,095                |
| [@byarcadia-app/anti-slop](https://www.npmjs.com/package/@byarcadia-app/anti-slop)        | Oxlint         | -          | -       | -     | 755                  |
| [biome-anti-slop](https://www.npmjs.com/package/biome-anti-slop)                          | Biome          | -          | -       | -     | 595                  |
| [@spacemansh/anti-slop](https://www.npmjs.com/package/@spacemansh/anti-slop)              | ESLint, Oxlint | -          | -       | -     | 65                   |
| [biome-plugin-anti-slop](https://www.npmjs.com/package/biome-plugin-anti-slop)            | Biome          | -          | -       | -     | 10                   |

Many packages copy anti-slop or bundle it in a shared config. The table below lists them by name.

| Package                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- |
| [@fisch0920/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@fisch0920/oxlint-plugin-anti-slop)           |
| [@kamaal111/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@kamaal111/oxlint-plugin-anti-slop)           |
| [@sha256_nulled/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@sha256_nulled/oxlint-plugin-anti-slop)   |
| [@aranlucas/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@aranlucas/oxlint-plugin-anti-slop)           |
| [@miladk/dmmulroy-anti-slop](https://www.npmjs.com/package/@miladk/dmmulroy-anti-slop)                           |
| [@victor-software-house/anti-slop](https://www.npmjs.com/package/@victor-software-house/anti-slop)               |
| [@iam4x/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@iam4x/oxlint-plugin-anti-slop)                   |
| [@adriandmitroca/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@adriandmitroca/oxlint-plugin-anti-slop) |
| [@sematico/anti-slop](https://www.npmjs.com/package/@sematico/anti-slop)                                         |
| [@buildkitgg/oxlint-plugin-anti-slop](https://www.npmjs.com/package/@buildkitgg/oxlint-plugin-anti-slop)         |
| [antislop-plugin](https://www.npmjs.com/package/antislop-plugin)                                                 |
| [oxlint-plugin-anti-slop](https://www.npmjs.com/package/oxlint-plugin-anti-slop)                                 |
| [@try-works/dsh-anti-slop](https://www.npmjs.com/package/@try-works/dsh-anti-slop)                               |
| [shoemaker-oxlint-plugins](https://www.npmjs.com/package/shoemaker-oxlint-plugins)                               |
| [@propsoch/oxlint-anti-slop-web](https://www.npmjs.com/package/@propsoch/oxlint-anti-slop-web)                   |
| [@antelopejs/tooling-configs](https://www.npmjs.com/package/@antelopejs/tooling-configs)                         |
| [@imapps/oxc-config](https://www.npmjs.com/package/@imapps/oxc-config)                                           |
| [@buildkitgg/oxlint-config](https://www.npmjs.com/package/@buildkitgg/oxlint-config)                             |
| [@saifulapm/oxc-config](https://www.npmjs.com/package/@saifulapm/oxc-config)                                     |
| [@r1-dev/code-style](https://www.npmjs.com/package/@r1-dev/code-style)                                           |
| [@butshouldwe/oxlint-config](https://www.npmjs.com/package/@butshouldwe/oxlint-config)                           |
| [@kiranaide/oxlint-kit](https://www.npmjs.com/package/@kiranaide/oxlint-kit)                                     |
| [@siim-m/config](https://www.npmjs.com/package/@siim-m/config)                                                   |
| [@iimmpact-sdn-bhd/oxlint](https://www.npmjs.com/package/@iimmpact-sdn-bhd/oxlint)                               |
| [@raintree-technology/trellis](https://www.npmjs.com/package/@raintree-technology/trellis)                       |
| [antislop-skillset](https://www.npmjs.com/package/antislop-skillset)                                             |

## General code rules

This is the largest group. Its rules cover many patterns at once. Examples are dead code, swallowed errors, `as any` casts, leftover `console.log` calls and placeholder bodies. Some are ESLint or Oxlint plugins. Others are CLIs that give a repository a score. Ultracite and eslint-plugin-no-mistakes have the most weekly downloads in this group.

| Name                                                                                         | Engine                | Created    | License | Stars | Weekly npm downloads |
| -------------------------------------------------------------------------------------------- | --------------------- | ---------- | ------- | ----- | -------------------- |
| [ultracite](https://github.com/haydenbleasel/ultracite)                                      | Oxlint, Biome, ESLint | 2022-03-18 | MIT     | 3,373 | 2,144,134            |
| [aislop](https://github.com/scanaislop/aislop)                                               | CLI                   | 2026-03-06 | MIT     | 749   | 29,564               |
| [eslint-plugin-slop](https://github.com/antfu/eslint-plugin-slop)                            | ESLint                | 2026-09-02 | MIT     | 128   | -                    |
| [vibecop](https://github.com/bhvbhushan/vibecop)                                             | CLI                   | 2026-04-01 | MIT     | 57    | -                    |
| [KarpeSlop](https://github.com/CodeDeficient/KarpeSlop)                                      | CLI                   | 2025-11-29 | MIT     | 39    | -                    |
| [grain](https://github.com/mmartoccia/grain)                                                 | CLI                   | 2026-03-04 | MIT     | 34    | -                    |
| [rigour](https://github.com/rigour-labs/rigour)                                              | CLI                   | 2026-01-04 | MIT     | 29    | -                    |
| [@yuvrajangadsingh/vibecheck](https://github.com/yuvrajangadsingh/vibecheck)                 | ESLint                | 2026-02-26 | -       | 27    | 626                  |
| [slopcheck-deslop](https://github.com/godagoo/slopcheck-deslop)                              | CLI                   | 2026-08-25 | MIT     | 18    | -                    |
| [antislop](https://github.com/skew202/antislop)                                              | CLI                   | 2025-12-31 | -       | 17    | -                    |
| [slop-police](https://github.com/kubk/slop-police)                                           | CLI                   | 2026-10-22 | MIT     | 15    | 2,587                |
| [eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)               | ESLint                | 2026-07-26 | MIT     | 15    | -                    |
| [prodlint](https://github.com/prodlint/prodlint)                                             | CLI                   | 2026-02-16 | MIT     | 15    | -                    |
| [eslint-plugin-llm-core](https://github.com/pertrai1/eslint-plugin-llm-core)                 | ESLint                | 2026-04-01 | MIT     | 14    | -                    |
| [lipstyk](https://github.com/styrene-lab/lipstyk)                                            | CLI                   | 2026-04-25 | MIT     | 13    | -                    |
| [eslint-plugin-no-mistakes](https://github.com/jonathanong/no-mistakes)                      | ESLint, Oxlint        | 2026-05-11 | MIT     | 12    | 114,857              |
| [@sshkeda/check](https://github.com/sshkeda/check)                                           | CLI                   | 2026-10-31 | MIT     | 12    | 2,066                |
| [@geoql/oxlint-plugin-vue-doctor, nuxt-doctor](https://github.com/geoql/doctor)              | Oxlint, ESLint        | 2026-05-28 | MIT     | 7     | 4,237                |
| [eslint-plugin-human-first](https://github.com/olistic/eslint-plugin-human-first)            | ESLint                | 2026-02-13 | -       | 6     | 1,484                |
| [realitygate](https://github.com/usmanmanii/realitygate)                                     | CLI                   | 2026-10-19 | MIT     | 5     | -                    |
| [eslint-plugin-deslop](https://github.com/ahxar/eslint-plugin-deslop)                        | ESLint                | 2026-01-20 | MIT     | 3     | 6,778                |
| [@alexcodeplace/slopgate](https://github.com/alexcodeplace/slopgate)                         | CLI                   | 2026-06-10 | MIT     | 3     | 1,392                |
| [eslint-plugin-ai-guardrails](https://github.com/isaacnewton123/eslint-plugin-ai-guardrails) | ESLint                | 2026-05-06 | MIT     | 3     | 200                  |
| [@sloplint/cli](https://github.com/mattbaconz/sloplint)                                      | CLI                   | 2026-10-15 | MIT     | 3     | 63                   |
| [slopscore](https://github.com/Vinay-O/slopscore)                                            | CLI                   | 2026-06-29 | MIT     | 3     | 63                   |
| [slopmop](https://github.com/zico-io/mop)                                                    | ESLint                | 2026-10-08 | MIT     | 1     | 2,175                |
| [lintmax](https://github.com/1qh/lintmax)                                                    | CLI                   | 2026-03-06 | -       | 1     | 425                  |
| [eslint-plugin-anti-slop](https://github.com/jakyeamos/eslint-plugin-anti-slop)              | ESLint                | 2026-06-22 | MIT     | 1     | 262                  |
| [eslint-plugin-ai-agent-standards](https://github.com/vlkalex/ai-agent-coding-standards)     | ESLint                | 2026-05-29 | MIT     | 1     | 141                  |
| [stopslop](https://github.com/BaryshevRS/stopslop)                                           | CLI                   | 2026-07-13 | MIT     | 1     | 61                   |
| [@rocharm/tsaudit](https://github.com/r0charm/tsaudit)                                       | Oxlint                | 2026-11-07 | MIT     | 0     | 675                  |
| [ts-slop](https://github.com/AugurCognito/ts_slop)                                           | ESLint                | 2026-07-06 | MIT     | 0     | 579                  |
| [sloplint-cli](https://github.com/Talha-2/sloplint)                                          | CLI                   | 2026-11-12 | MIT     | 0     | 293                  |
| [@slop-lab/qg](https://github.com/slop-lab/quality-gate)                                     | CLI                   | 2026-07-04 | MIT     | 0     | 51                   |
| [oxc-config-ai-guardrails](https://github.com/matteoantoci/oxc-config-ai-guardrails)         | Oxlint                | 2026-07-31 | MIT     | 0     | -                    |
| [oxlint-better](https://www.npmjs.com/package/oxlint-better)                                 | Oxlint                | -          | -       | -     | 1,252                |
| [unslop](https://www.npmjs.com/package/unslop)                                               | CLI                   | -          | -       | -     | 738                  |
| [eslint-plugin-ai-rules](https://www.npmjs.com/package/eslint-plugin-ai-rules)               | ESLint                | -          | -       | -     | 689                  |
| [leancheck](https://www.npmjs.com/package/leancheck)                                         | CLI                   | -          | -       | -     | 55                   |
| [@methiu/raigal](https://www.npmjs.com/package/@methiu/raigal)                               | CLI                   | -          | -       | -     | 48                   |

## Other languages

Some rule sets target languages other than JavaScript. ex_slop adds Credo checks for Elixir. sloppy adds 34 rules for PHP. Several tools check Python code.

| Name                                                                 | Engine  | Created    | License    | Stars | Weekly npm downloads |
| -------------------------------------------------------------------- | ------- | ---------- | ---------- | ----- | -------------------- |
| [sloppy](https://github.com/Heyosseus/sloppy)                        | PHPStan | 2026-09-10 | MIT        | 231   | -                    |
| [ex_slop](https://github.com/elixir-vibe/ex_slop)                    | Credo   | 2026-03-07 | MIT        | 176   | -                    |
| [AI-SLOP-Detector](https://github.com/flamehaven01/AI-SLOP-Detector) | Python  | 2026-01-08 | MIT        | 120   | -                    |
| [sloppylint](https://github.com/rsionnach/sloppylint)                | Python  | 2025-12-05 | -          | 91    | -                    |
| [agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)     | Python  | 2026-04-11 | Apache-2.0 | 44    | -                    |
| [ComposeLintAI](https://github.com/TechsOneAi/ComposeLintAI)         | Kotlin  | 2026-09-24 | Apache-2.0 | 36    | -                    |
| [thai-lint](https://github.com/be-wise-be-kind/thai-lint)            | Python  | 2025-10-07 | MIT        | 25    | -                    |
| [slopcop](https://github.com/cm2435/slopcop)                         | Python  | 2026-04-06 | MIT        | 11    | -                    |

## Comments

These tools flag comments that repeat the code or narrate the change. eslint-plugin-no-comment-slop has 12 rules for comments[^no-comment-slop]. windbag flags ticket numbers, past behavior and hedging words in comments[^windbag].

| Name                                                                                             | Engine                 | Created    | License    | Stars | Weekly npm downloads |
| ------------------------------------------------------------------------------------------------ | ---------------------- | ---------- | ---------- | ----- | -------------------- |
| [windbag](https://github.com/scale-venture-partners/windbag)                                     | CLI                    | 2026-08-05 | MIT        | 26    | -                    |
| [eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop)       | ESLint, Oxlint, rslint | 2026-07-30 | MIT        | 13    | -                    |
| [stop-ai-slop](https://github.com/WhiteBite/stop-ai-slop)                                        | CLI                    | 2026-09-23 | MIT        | 7     | 269                  |
| [comment-checker](https://github.com/systemfsoftware/comment-checker)                            | Claude Code hook       | 2026-08-12 | Apache-2.0 | 6     | -                    |
| [@dannote/sloplint](https://github.com/dannote/sloplint)                                         | CLI                    | 2026-02-04 | MIT        | 4     | 29                   |
| [@vasilvestre/opencode-comment-checker](https://github.com/vasilvestre/opencode-comment-checker) | OpenCode plugin        | 2026-10-30 | MIT        | 0     | 53                   |

## Hallucinated packages

Agents sometimes import packages that do not exist. An attacker can publish a package with such a name. This attack is called slopsquatting. These tools check package names against the registries before install.

| Name                                                                               | Engine | Created    | License    | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------------------- | ------ | ---------- | ---------- | ----- | -------------------- |
| [open-code-review](https://github.com/raye-deng/open-code-review)                  | CLI    | 2026-03-04 | -          | 41    | -                    |
| [sloppy-joe](https://github.com/brennhill/sloppy-joe)                              | CLI    | 2026-03-21 | Apache-2.0 | 34    | -                    |
| [relais](https://github.com/Paskod121/relais)                                      | CLI    | 2026-10-22 | MIT        | 15    | -                    |
| [slopcheck](https://github.com/mattschaller/slopcheck)                             | CLI    | 2026-03-08 | MIT        | 11    | -                    |
| [dep-hallucinator](https://github.com/serhanwbahar/dep-hallucinator)               | CLI    | 2025-06-18 | MIT        | 9     | -                    |
| [slopspotter](https://github.com/conranpearce/slopspotter)                         | CLI    | 2026-04-25 | MIT        | 6     | -                    |
| [slop-deps](https://github.com/viditx/slop-deps)                                   | CLI    | 2026-10-26 | MIT        | 1     | 344                  |
| [@topaisaas/agentpr-guard](https://www.npmjs.com/package/@topaisaas/agentpr-guard) | CLI    | -          | -          | -     | 17                   |

## Structure and architecture

These tools check where code lives and how it depends on other code. enforced-architecture is a catalog of rules in 11 categories[^enforced-architecture]. Its README asks agents to rewrite the rules for other stacks.

| Name                                                                               | Engine | Created    | License | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------------------- | ------ | ---------- | ------- | ----- | -------------------- |
| [oxlint-plugin-complexity](https://github.com/itaymendel/oxlint-plugin-complexity) | Oxlint | 2025-12-25 | MIT     | 52    | -                    |
| [dictator](https://github.com/seuros/dictator)                                     | CLI    | 2025-12-03 | -       | 28    | -                    |
| [deslop](https://github.com/Ivy-Apps/deslop)                                       | CLI    | 2025-12-14 | MIT     | 19    | -                    |
| [enforced-architecture](https://github.com/GLips/enforced-architecture)            | Oxlint | 2026-02-19 | -       | 11    | -                    |
| [slopbuckets](https://github.com/NicolasCaous/slopbuckets)                         | CLI    | 2026-10-04 | MIT     | 2     | 1,049                |
| [slopbrick](https://github.com/usebrick/platform)                                  | CLI    | 2026-06-26 | MIT     | 1     | 41                   |
| [clonesieve](https://www.npmjs.com/package/clonesieve)                             | CLI    | -          | -       | -     | 357                  |

## User interfaces

These tools check UI code or the rendered page. @shadcn/lint checks how components in a Tailwind design system are styled[^shadcn-lint]. renderlint opens each page in a browser at several widths[^renderlint]. Others look for visual habits of generated pages, such as purple gradients.

| Name                                                                   | Engine         | Created    | License    | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------- | -------------- | ---------- | ---------- | ----- | -------------------- |
| [lint](https://github.com/shadcn-ui/lint)                              | ESLint, Oxlint | 2026-09-02 | MIT        | 3,368 | -                    |
| [renderlint](https://github.com/ngocanhnckh/renderlint)                | Browser        | 2026-10-25 | MIT        | 641   | -                    |
| [ui-craft-detect](https://github.com/educlopez/ui-craft)               | CLI            | 2026-03-19 | MIT        | 465   | 678                  |
| [ai-design-check](https://github.com/enmerasoftware/ai-design-check)   | CLI            | 2026-10-28 | MIT        | 252   | -                    |
| [ux-skill](https://github.com/Laith0003/ux-skill)                      | CLI            | 2026-05-24 | MIT        | 105   | -                    |
| [@gessobuild/anti-slop](https://github.com/Gesso-Build/skills)         | CLI            | 2026-07-28 | MIT        | 94    | 131                  |
| [montology](https://github.com/shinyobjectz/montology)                 | CLI            | 2026-08-10 | Apache-2.0 | 61    | -                    |
| [unslop](https://github.com/avivgerz-hue/unslop)                       | CLI            | 2026-11-07 | MIT        | 54    | -                    |
| [slop-detect](https://github.com/ravidsrk/slop-detect)                 | Browser        | 2026-05-26 | MIT        | 21    | 354                  |
| [ui-animation-polish](https://github.com/hasanify/ui-animation-polish) | CLI            | 2026-11-06 | MIT        | 17    | -                    |
| [oversight-lint](https://github.com/rachelslurs/storybook-oversight)   | CLI            | 2026-07-12 | MIT        | 15    | 4,106                |
| [aislopmeter](https://github.com/omergocmen/aislopmeter)               | CLI            | 2026-10-17 | MIT        | 12    | 59                   |
| [pixelslop](https://github.com/gabelul/pixelslop)                      | Browser        | 2026-03-20 | Apache-2.0 | 10    | 41                   |
| [eslint-plugin-agentlint](https://github.com/ratikkoka/agentlint)      | ESLint         | 2026-02-14 | MIT        | 0     | 2,156                |
| [uislop](https://github.com/princejain756/uislop)                      | CLI            | 2026-11-05 | MIT        | 0     | 383                  |
| [squint-test](https://github.com/AbhinavGGarg/Squint)                  | Browser        | 2026-11-02 | -          | 0     | 50                   |

## Japanese prose

textlint-rule-preset-ai-writing finds structures that are common in Japanese text written by AI[^ai-writing]. Examples are bold list headings and colons. textlint-rule-preset-ai-words-ja finds words that are common in such text with morphological analysis[^ai-words-ja].

| Name                                                                                                | Engine   | Created    | License | Stars | Weekly npm downloads |
| --------------------------------------------------------------------------------------------------- | -------- | ---------- | ------- | ----- | -------------------- |
| [textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing)   | textlint | 2025-06-16 | MIT     | 1,164 | -                    |
| [textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)       | textlint | 2026-09-12 | MIT     | 131   | -                    |
| [ux-writing-dead-cliche](https://github.com/BoxPistols/ux-writing-dead-cliche)                      | textlint | 2026-08-28 | MIT     | 1     | -                    |
| [textlint-rule-preset-ja-no-ai-slop](https://github.com/kubosho/textlint-rule-preset-ja-no-ai-slop) | textlint | 2026-09-26 | MIT     | 0     | 194                  |

## English prose

This is the second largest group. Most tools match lists of words and phrases, such as "delve". Some also check sentence structure. Many give the text a score and fail CI above a limit.

| Name                                                                                          | Engine   | Created    | License    | Stars | Weekly npm downloads |
| --------------------------------------------------------------------------------------------- | -------- | ---------- | ---------- | ----- | -------------------- |
| [SlopMonster](https://github.com/ItsssssJack/SlopMonster)                                     | CLI      | 2026-08-29 | MIT        | 1,291 | -                    |
| [sloptrim](https://github.com/seyedehsanhadi/sloptrim)                                        | CLI      | 2026-08-13 | Apache-2.0 | 425   | -                    |
| [slopless](https://github.com/berelevant-ai/slopless)                                         | textlint | 2026-05-16 | MIT        | 342   | -                    |
| [seiso](https://github.com/scarletkc/seiso)                                                   | CLI      | 2026-09-27 | MIT        | 196   | -                    |
| [vale-ai-tells](https://github.com/tbhb/vale-ai-tells)                                        | Vale     | 2025-12-02 | MIT        | 135   | -                    |
| [humanizer-lint](https://github.com/yanstd888/humanizer-lint)                                 | CLI      | 2026-10-30 | MIT        | 119   | -                    |
| [ai-slop-detector](https://github.com/FeedHive/ai-slop-detector)                              | CLI      | 2026-10-12 | MIT        | 111   | -                    |
| [contextlint](https://github.com/nozomi-koborinai/contextlint)                                | CLI      | 2026-03-04 | Apache-2.0 | 47    | -                    |
| [snifftest](https://github.com/DanRWilloughby/snifftest)                                      | CLI      | 2026-09-17 | MIT        | 38    | -                    |
| [vale-llm-slop](https://github.com/Syntaf/vale-llm-slop)                                      | Vale     | 2026-07-31 | -          | 31    | -                    |
| [cadence-deslop](https://github.com/wuisabel-gif/Cadence)                                     | CLI      | 2026-06-19 | MIT        | 29    | 592                  |
| [no-slop](https://github.com/Byk3y/no-slop)                                                   | CLI      | 2026-04-08 | MIT        | 16    | -                    |
| [textlint-rule-preset-ste-ai](https://github.com/Jamie-BitFlight/textlint-rule-preset-ste-ai) | textlint | 2026-07-26 | MIT        | 15    | -                    |
| [simple-english](https://github.com/TonyCTHsu/simple-english)                                 | CLI      | 2026-09-27 | MIT        | 14    | -                    |
| [writehuman](https://github.com/arslanrakh/write-human)                                       | CLI      | 2026-10-02 | MIT        | 13    | 244                  |
| [slopvac](https://github.com/slopvac/slopvac)                                                 | CLI      | 2026-07-27 | Apache-2.0 | 13    | -                    |
| [ai-slop-detect](https://github.com/antydizajn/ai-slop-detect)                                | CLI      | 2026-06-02 | MIT        | 9     | -                    |
| [wsc](https://github.com/theserverlessdev/wsc)                                                | CLI      | 2025-03-06 | MIT        | 9     | -                    |
| [voices](https://github.com/jdkato/voices)                                                    | Vale     | 2026-08-31 | MIT        | 7     | -                    |
| [writinglint](https://github.com/NikhilVerma/writinglint)                                     | CLI      | 2026-07-07 | MIT        | 7     | -                    |
| [ste-lint](https://github.com/johnsaigle/ste-lint)                                            | CLI      | 2026-08-05 | MIT        | 6     | -                    |
| [slophound](https://github.com/JosXa/slophound)                                               | CLI      | 2026-09-05 | MIT        | 6     | -                    |
| [zero-slop](https://github.com/trefeon/zero-slop)                                             | CLI      | 2026-08-18 | MIT        | 6     | -                    |
| [slop-chop-wasm](https://github.com/dcadolph/slop-chop)                                       | CLI      | 2026-06-25 | MIT        | 5     | 95                   |
| [slop](https://github.com/bheijden/slop)                                                      | CLI      | 2026-08-28 | Apache-2.0 | 5     | -                    |
| [plain-english](https://github.com/nordscope-fi/plain-english)                                | CLI      | 2026-08-06 | MIT        | 4     | 169                  |
| [style-doctor](https://github.com/baronunread/style-doctor)                                   | CLI      | 2026-08-28 | MIT        | 1     | 913                  |
| [shibbo](https://github.com/xvr2e7/shibbo)                                                    | CLI      | 2026-11-08 | MIT        | 1     | 531                  |
| [@kcgdz/sloplint](https://github.com/kcgdz/sloplint)                                          | CLI      | 2026-10-31 | MIT        | 1     | 48                   |
| [llm-slop-detector](https://github.com/mandakan/llm-slop-detector)                            | CLI      | 2026-04-23 | MIT        | 1     | 27                   |
| [unslop-ci](https://github.com/cj-vana/unslop-ci)                                             | CLI      | 2026-07-11 | -          | 1     | 12                   |
| [readme-unslop](https://github.com/HiegBr/readme-unslop)                                      | CLI      | 2026-11-01 | MIT        | 0     | 355                  |
| [@alokraj68/plainspoken](https://github.com/alokraj68/craftkit)                               | CLI      | 2026-08-11 | MIT        | 0     | 55                   |
| [@askeleven/bot-tells](https://github.com/askeleven/bot-tells)                                | CLI      | 2026-10-17 | MIT        | 0     | 49                   |
| [sepia-lint](https://github.com/zhaomo08/sepia-lint)                                          | CLI      | 2026-09-02 | MIT        | 0     | 13                   |
| [ai-slop-linter](https://www.npmjs.com/package/ai-slop-linter)                                | CLI      | -          | -          | -     | 104                  |
| [dontreadme-cli](https://www.npmjs.com/package/dontreadme-cli)                                | CLI      | -          | -          | -     | 12                   |

## Prose in other languages

These tools target French, Spanish, German, Korean or Chinese. Some of them also check English.

| Name                                                                   | Engine | Created    | License  | Stars | Weekly npm downloads |
| ---------------------------------------------------------------------- | ------ | ---------- | -------- | ----- | -------------------- |
| [zhtw-mcp](https://github.com/sysprog21/zhtw-mcp)                      | CLI    | 2026-03-10 | MIT      | 511   | -                    |
| [llmlint](https://github.com/notnotype/llmlint)                        | CLI    | 2026-06-30 | AGPL-3.0 | 13    | -                    |
| [slopcheck-fr](https://github.com/tns-research/slopcheck-fr)           | CLI    | 2026-10-10 | MIT      | 12    | -                    |
| [slop-radar](https://github.com/renefichtmueller/slop-radar)           | CLI    | 2026-03-19 | MIT      | 10    | 14                   |
| [slop-gate](https://github.com/hwajongpark/slop-gate)                  | CLI    | 2026-05-29 | MIT      | 5     | 42                   |
| [ai-slop-detector](https://github.com/liuxiaobai8868/ai-slop-detector) | CLI    | 2026-06-03 | MIT      | 5     | -                    |
| [@e1i0/human](https://github.com/e1i0r/human)                          | CLI    | 2026-09-15 | -        | 1     | 16                   |
| [slopfix](https://github.com/Zwarmex/slopfix)                          | CLI    | 2026-10-25 | MIT      | 0     | 42                   |
| [buvard](https://www.npmjs.com/package/buvard)                         | CLI    | -          | -        | -     | 736                  |

## Agent configuration

These tools check the files that agents read. agnix is a linter and language server for agent configuration[^agnix]. ctxlint, driftlint and agents-lint check context files against the code[^ctxlint][^driftlint][^agents-lint]. They report paths that no longer exist and commands that no longer work. Many other tools check only `SKILL.md` files.

| Name                                                                           | Engine   | Created    | License    | Stars | Weekly npm downloads |
| ------------------------------------------------------------------------------ | -------- | ---------- | ---------- | ----- | -------------------- |
| [agnix](https://github.com/agent-sh/agnix)                                     | CLI, LSP | 2026-01-30 | Apache-2.0 | 487   | -                    |
| [skill-check](https://github.com/thedaviddias/skill-check)                     | CLI      | 2026-02-20 | MIT        | 194   | -                    |
| [lintlang](https://github.com/hermes-labs-ai/lintlang)                         | CLI      | 2026-02-28 | Apache-2.0 | 147   | -                    |
| [SkillMD](https://github.com/skillmds/SkillMD)                                 | CLI      | 2026-08-25 | MIT        | 147   | -                    |
| [agentlinter](https://github.com/seojoonkim/agentlinter)                       | CLI      | 2026-02-05 | -          | 83    | -                    |
| [driftlint](https://github.com/alifurkangokce/driftlint)                       | CLI      | 2026-08-11 | MIT        | 61    | -                    |
| [agentskill-kit](https://github.com/Lethe044/agentskill-kit)                   | CLI      | 2026-03-14 | MIT        | 51    | -                    |
| [agents-md-cookbook](https://github.com/Taiizor/agents-md-cookbook)            | CLI      | 2026-06-14 | MIT        | 29    | -                    |
| [doodle](https://github.com/krishyaid-coder/doodle)                            | CLI      | 2026-06-20 | MIT        | 26    | -                    |
| [@carlrannaberg/cclint](https://github.com/carlrannaberg/cclint)               | CLI      | 2025-08-21 | -          | 22    | 3,461                |
| [agents-contract](https://github.com/AntoGA/agents-contract)                   | CLI      | 2026-10-19 | MIT        | 20    | -                    |
| [schliff](https://github.com/Zandereins/schliff)                               | CLI      | 2026-03-19 | MIT        | 18    | -                    |
| [pulser](https://github.com/TheStack-ai/pulser)                                | CLI      | 2026-03-18 | MIT        | 18    | -                    |
| [agents-lint](https://github.com/giacomo/agents-lint)                          | CLI      | 2026-02-27 | -          | 16    | -                    |
| [claudelint](https://github.com/pdugan20/claudelint)                           | CLI      | 2026-02-08 | MIT        | 16    | -                    |
| [skill-lint](https://github.com/himself65/skill-lint)                          | CLI      | 2026-04-01 | MIT        | 16    | -                    |
| [nori-lint](https://github.com/tilework-tech/nori-lint)                        | CLI      | 2026-01-30 | Apache-2.0 | 15    | -                    |
| [agentconfig-doctor](https://github.com/vasikmansuri/agentconfig-doctor)       | CLI      | 2026-10-14 | MIT        | 13    | -                    |
| [ctxlint](https://github.com/YawLabs/ctxlint)                                  | CLI      | 2026-04-05 | MIT        | 12    | -                    |
| [cclint](https://github.com/felixgeelhaar/cclint)                              | CLI      | 2025-07-20 | MIT        | 12    | -                    |
| [cursor-doctor](https://github.com/nedcodes-ok/cursor-doctor)                  | CLI      | 2026-02-17 | MIT        | 10    | -                    |
| [lintai](https://github.com/777genius/lintai)                                  | CLI      | 2026-03-26 | -          | 10    | -                    |
| [skill-tools](https://github.com/skill-tools/skill-tools)                      | CLI      | 2026-02-10 | Apache-2.0 | 9     | -                    |
| [instrlint](https://github.com/jed1978/instrlint)                              | CLI      | 2026-04-05 | MIT        | 8     | -                    |
| [skillscheck](https://github.com/Swival/skillscheck)                           | CLI      | 2026-03-11 | MIT        | 8     | -                    |
| [dogent](https://github.com/yegor256/dogent)                                   | CLI      | 2026-06-11 | MIT        | 8     | -                    |
| [skillci](https://github.com/kabirnarang39/skillci)                            | CLI      | 2026-07-21 | Apache-2.0 | 8     | -                    |
| [ai-context-kit](https://github.com/ofershap/ai-context-kit)                   | CLI      | 2026-03-04 | MIT        | 8     | -                    |
| [skillcheck](https://github.com/Sagargupta16/skillcheck)                       | CLI      | 2026-07-06 | MIT        | 5     | -                    |
| [claude-config-auditor](https://github.com/emreyildirim/claude-config-auditor) | CLI      | 2026-05-18 | MIT        | 5     | -                    |

## MCP tool schemas

These tools check the tool definitions of MCP servers.

| Name                                                          | Engine | Created    | License    | Stars | Weekly npm downloads |
| ------------------------------------------------------------- | ------ | ---------- | ---------- | ----- | -------------------- |
| [mcp-assert](https://github.com/blackwell-systems/mcp-assert) | CLI    | 2026-04-23 | MIT        | 26    | -                    |
| [mcp-tef](https://github.com/StacklokLabs/mcp-tef)            | CLI    | 2025-12-11 | Apache-2.0 | 13    | -                    |
| [mcp-lint](https://github.com/robert19001-cmyk/mcp-lint)      | CLI    | 2026-03-25 | MIT        | 1     | 1,195                |

## Linters that use a model

Some tools look like linters but run each rule through a model. alint is an ESLint-like CLI that sends its rules to a model through an OpenAI-compatible API[^alint]. Others use Jev, a decision model from TypeSafe AI.

| Name                                                                       | Model                 |
| -------------------------------------------------------------------------- | --------------------- |
| [alint](https://github.com/alint-dev/alint)                                | OpenAI-compatible API |
| [jev-pref](https://github.com/doeixd/jev-pref)                             | Jev                   |
| [taste-lint](https://github.com/mblode/taste-lint)                         | Jev                   |
| [slop-grader](https://github.com/lukstei/slop-grader)                      | Jev                   |
| [pi-jev-anti-slop](https://www.npmjs.com/package/pi-jev-anti-slop)         | Jev                   |
| [lint-claude](https://github.com/vtemian/lint-claude)                      | Claude                |
| [@agimon-ai/vibe-lint](https://www.npmjs.com/package/@agimon-ai/vibe-lint) | LLM                   |

## Related projects that are not lint rules

Many well-known projects against "AI slop" are agent skills or prompts. Examples are stop-ai-slop, stop-slop, no-ai-slop, impeccable and taste-skill. stop-slop and no-ai-slop had 19,031 and 13,601 stars on November 18, 2026. These skills run inside a model, so their results can differ from run to run. The catalog does not list them.

## Trends in 2026

Most of these tools are new. Of the entries with a known creation date, about 44% were created in or after August 2026. October 2026 alone added 30 entries. JS plugins for Oxlint made it cheap to publish rules without Rust. Most entries are still standalone CLIs, which run on any language.

The rules now check evidence as well as wording. Prose rules still list words such as "delve". Code rules check whether a test runs the real code. They check whether a type assertion has a reason. Configuration rules check whether a context file matches the code. None of these checks needs a model, so they can run on every edit.

## Related articles

- [Oxlint](/sloppedia/oxlint)
- [fallow](/sloppedia/fallow)
- [Module boundary tools](/sloppedia/module-boundary-tools)
- [decision model](/sloppedia/decision-model)
- [AI slop](/sloppedia/ai-slop)

[^landmines]: interfere-inc, "[landmines](https://github.com/interfere-inc/landmines)". Accessed November 18, 2026.

[^vibe-proof]: SukkaW, "[eslint-plugin-vibe-proof](https://github.com/SukkaW/eslint-plugin-vibe-proof)". Accessed November 18, 2026.

[^agent-slop-lint]: JordanGunn, "[agent-slop-lint](https://github.com/JordanGunn/agent-slop-lint)". Accessed November 18, 2026.

[^enforced-architecture]: GLips, "[enforced-architecture](https://github.com/GLips/enforced-architecture)". Accessed November 18, 2026.

[^shadcn-lint]: shadcn-ui, "[@shadcn/lint](https://github.com/shadcn-ui/lint)". Accessed November 18, 2026.

[^agent-lint]: MartinCastroAlvarez, "[agent-lint](https://github.com/MartinCastroAlvarez/agent-lint)". Accessed November 18, 2026.

[^suppress-ratchet]: motchalini-llc, "[Suppress Ratchet](https://github.com/motchalini-llc/suppress-ratchet)". Accessed November 18, 2026.

[^anti-slop]: dmmulroy, "[anti-slop](https://github.com/dmmulroy/anti-slop)". Accessed November 18, 2026.

[^no-comment-slop]: jantimon, "[eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop)". Accessed November 18, 2026.

[^windbag]: scale-venture-partners, "[windbag](https://github.com/scale-venture-partners/windbag)". Accessed November 18, 2026.

[^renderlint]: ngocanhnckh, "[renderlint](https://github.com/ngocanhnckh/renderlint)". Accessed November 18, 2026.

[^ai-writing]: textlint-ja, "[textlint-rule-preset-ai-writing](https://github.com/textlint-ja/textlint-rule-preset-ai-writing)". Accessed November 18, 2026.

[^ai-words-ja]: p1ass, "[textlint-rule-preset-ai-words-ja](https://github.com/p1ass/textlint-rule-preset-ai-words-ja)". Accessed November 18, 2026.

[^agnix]: agent-sh, "[agnix](https://github.com/agent-sh/agnix)". Accessed November 18, 2026.

[^ctxlint]: YawLabs, "[ctxlint](https://github.com/YawLabs/ctxlint)". Accessed November 18, 2026.

[^driftlint]: alifurkangokce, "[driftlint](https://github.com/alifurkangokce/driftlint)". Accessed November 18, 2026.

[^agents-lint]: giacomo, "[agents-lint](https://github.com/giacomo/agents-lint)". Accessed November 18, 2026.

[^alint]: alint-dev, "[alint](https://github.com/alint-dev/alint)". Accessed November 18, 2026.
