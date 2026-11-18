---
title: "Leaving lint judgments to decision models"
description: "How oxlint-plugin-decision has a decision model, which does not generate text, judge lint rules that cannot be written as syntax tree patterns, the incident where it was switched to a chat model, its weakness in Japanese, and the models as of November 2026."
tags: ["decision-model", "oxlint", "lint"]
published: true
---

Some lint rules cannot be written as a pattern over the syntax tree. "Does this call write personal data to a log?" and "Does this function's name promise a read while its body also writes?" are examples. A person or a large language model has had to judge them in review. I now have a decision model judge them on every lint run, with [oxlint-plugin-decision](https://github.com/masseater/masseater.dev/tree/main/libs/oxlint-plugin-decision).

## Why a decision model

A decision model does not write text. It reads the input and the question in one forward pass and returns a probability for each answer[^sloppedia-decision-model]. Most vendors bill input tokens only, and an answer comes back in a few hundred milliseconds. That is cheap and fast enough to run over every file in a repository.

A chat model can answer the same question, but it writes its answer token by token and bills for the output. Running one on every lint makes the cost and the waiting time grow with the size of the codebase.

## How the plugin works

A rule is a question with a fixed set of answers. You write it with `defineDecisionRule`, choose what it looks at, such as a function, a call, a JSX element or a whole file, and set a cutoff. The plugin reports an error when the probability of the answer the rule cares about clears the cutoff[^plugin-readme].

The rules that are turned on share one request per file and per model. Turning on more rules does not add requests. The plugin ships presets, such as `recommended` for personal data in logs, prompt injection and hard-coded secrets, and `ai-slop` for padding that coding agents leave behind[^plugin-readme].

The plugin started as a fork of [oxlint-plugin-jev](https://github.com/wobsoriano/oxlint-plugin-jev) by Robert Soriano. The rules that check a claim the code makes about itself are adapted from [jev-lint](https://github.com/mizchi/jev-lint) by mizchi[^plugin-readme].

## Only decision models

On November 15, 2026, while moving the plugin's calls onto Cloudflare AI Gateway, an AI session replaced Jev with a chat model on Workers AI. My instruction was only to move the calls to AI Gateway. The session looked for a Workers AI model that worked without credits, and missed Clef, the decision model that Workers AI had offered since October 1. CI then sent tens of thousands of questions to the chat model, and Workers AI started to bill.

A plugin named decision should never call a chat model. Since version 0.8.0 the plugin accepts only Jev and Clef. The model type is a union of their names, the settings are checked at run time, and a test fails if the source calls a chat endpoint[^plugin-readme]. When a call moves to another provider, the model category stays the same, and if no model of that category is available, the owner decides.

## Japanese is weak

When the rule's question or the code's text is in Japanese, the answers get noticeably worse. I measured this with [mst-ja-decision-bench](/blogs/mst-ja-decision-bench). In the run of October 11, 2026, every model lost about 20 points of accuracy on Japanese business rules compared with English. Clef Flash, the plugin's default, ranked eleventh of 16 models. Liquid d1 ranked third.

For now I write the questions in English and keep the rules that read Japanese text in review only.

## The models as of November 18

New models keep coming. In the week before I wrote this, Google released Gemini Decision 1, Perplexity released Decider v1.3 as open weights, Liquid AI released d1.2, and Microsoft released Microsoft-Decision-1.1[^sloppedia-decision-model]. Liquid d1.2 costs 0.02 USD per million input tokens, about half the price of Clef Flash[^liquid-docs].

The benchmarks still put language models on top. In DecideBench v2, no decision model matched Claude Opus 4.8, and none passed 74% on applying rules with numbers[^decidebench]. The rules in a lint plugin are exactly that kind of question.

## Next

First I will add the new models to mst-ja-decision-bench and measure them in Japanese. If one of them beats Clef Flash, I will choose the default again, within the cost rule that keeps Cloudflare usage inside the included allowance.

AWS's [Strands Decider](https://github.com/strands-labs/strands-decider) publishes its training recipe, data sources and research log with the model[^strands-repo]. One RTX 3090 retrains it in about 11 hours. I want to try training a decider of my own on Japanese rule questions with that recipe.

[^sloppedia-decision-model]: masseater「[decision model](/sloppedia/decision-model)」Sloppedia.

[^plugin-readme]: masseater「[@r_masseater/oxlint-plugin-decision](https://github.com/masseater/masseater.dev/tree/main/libs/oxlint-plugin-decision)」GitHub.

[^liquid-docs]: Liquid AI「[Decision Models](https://docs.liquid.ai/lfm/models/decision-models)」Read on November 18, 2026.

[^decidebench]: choyiny「[DecideBench](https://github.com/choyiny/decidebench)」GitHub. Read on November 18, 2026.

[^strands-repo]: Strands Labs「[strands-decider](https://github.com/strands-labs/strands-decider)」GitHub. Read on November 18, 2026.
