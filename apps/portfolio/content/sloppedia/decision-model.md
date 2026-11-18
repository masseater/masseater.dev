---
title: "decision model"
description: "A kind of AI model that does not generate text, and returns a probability for each answer after reading an input and a question. It started with Jev in September 2026, and more than ten companies joined within two months."
tags: ["大規模言語モデル", "AI の評価", "2026年のソフトウェア"]
published: true
infobox:
  - label: "別名"
    value: "System One モデル"
  - label: "最初のモデル"
    value: "Jev（TypeSafe AI、2026年9月15日）"
  - label: "代表的な API"
    value: "System One API（/v1/systemone）"
  - label: "問いの種類"
    value: "Noul、Choice、Score ほか"
  - label: "課金"
    value: "多くは入力トークンだけ"
---

A decision model is a kind of AI model that does not generate text. It reads an input and a question, and returns a probability for each answer the question allows. TypeSafe AI, which released the first one, calls the class a System One model[^typesafe-launch].

## Mechanism

A language model writes its answer one token at a time. A decision model reads the input and every option in one forward pass, and scores the options at once. Most vendors bill input tokens only and charge nothing for output[^typesafe-launch][^liquid-docs].

Strands Decider shows one way to build one. It takes a pretrained language model, removes the head that predicts the next token, and attaches a small head of about one million parameters. The head compares the hidden state at the answer position with the hidden state at the last token of each option[^strands-repo].

Many questions about one input cost little more than one question. The input is read once, and each question adds only its own tokens[^strands-repo]. Gemini Decision 1 accepts up to 1,000 questions in one request[^gemini-blog].

## Question types

Three question types are common to most models. Noul asks a yes or no question and returns the probability of yes. Choice picks one of several options. Score places the input on an ordered rubric[^strands-repo][^gemini-blog].

Later models added more types. Jev 1.14 added Box, which locates a region in an image[^typesafe-docs]. Liquid d1.2 added numbers, dates, ranges and spans of text[^liquid-docs]. Perplexity Decider v1.3 added Locate, which returns the matching text and its position[^pplx-x].

## System One API

TypeSafe AI serves Jev at the path `/v1/systemone`. A request carries the input as `state` and a set of named questions[^typesafe-docs]. Cloudflare Clef, Liquid d1 and Strands Decider accept requests in the same shape[^clef-changelog][^liquid-docs][^strands-repo]. Perplexity ships a wrapper that serves its Decider behind the same API[^decidebench].

## History

TypeSafe AI released Jev in early access on September 15, 2026, as its first System One model. The name comes from the fast System 1 thinking in Daniel Kahneman's Thinking, Fast and Slow[^typesafe-launch].

Other vendors followed within weeks. Cloudflare released Clef and Clef Flash as open weights on October 1, 2026, and serves them on Workers AI[^clef-changelog]. Liquid AI released d1 on October 5, 2026[^liquid-d1]. AWS Strands Labs released Strands Decider 2B as open source around the same time[^marktechpost-strands]. OpenAI offers a Decisions API that runs on GPT-6 Luna.

In November 2026 the releases continued. Google released Gemini Decision 1 on November 11[^gemini-blog]. Perplexity released Decider v1.3 and Decider Flash v1.3 as open weights around November 12[^pplx-x]. Liquid AI released d1.2 and d1.2-ultra, and Microsoft released Microsoft-Decision-1.1[^openrouter-models].

On November 3, 2026, TypeSafe AI objected to the term decision model. It argued that the model only makes judgments, and that code makes the decisions[^typesafe-name].

## Models

The main models as of November 18, 2026 are listed below.

- Jev 1.14 from TypeSafe AI is served by API only and costs 0.042 USD per million input tokens[^typesafe-docs].
- Clef from Cloudflare has 27B parameters, Clef Flash has 9B, and Clef Omni also reads audio and video. Clef Flash costs 0.038 USD per million input tokens on Workers AI[^clef-docs].
- Liquid d1.2 from Liquid AI reads text, images and audio and costs 0.02 USD per million input tokens. The open weights d1-2B are based on LFM3[^liquid-docs].
- Strands Decider from AWS Strands Labs is Apache 2.0 open source, with versions of 2B to 26B on Qwen3.5 and Gemma 4. Its training recipe and research log are public too[^strands-repo].
- Gemini Decision 1 from Google reads text, images, audio, video and PDF files, and costs 0.10 USD per million input tokens[^gemini-blog].
- Decider v1.3 from Perplexity is a 27B open weight model, and Decider Flash v1.3 is a 4B model[^pplx-x].
- Drex Max from Nace AI and GLiDE from Fastino Labs lead the Artificial Analysis Decision Index v2[^aa-v2].

## Evaluation

Several benchmarks compete. Artificial Analysis published its Decision Index on October 13, 2026, and rebuilt it as v2 on November 8. In v2, 45% of the index uses private data, and the score rewards accuracy and penalizes a poor Brier score. Drex Max v1.1 and GLiDE v1.2 led the decision models with 73, but two language models scored higher[^aa-v2].

DecideBench v2, measured on November 9, 2026, gave the same picture. No decision model matched Claude Opus 4.8, which answered 99.3% correctly. The weakest area was applying rules with numbers, where no decision model passed 74%[^decidebench].

Vendors report that decision models tend to be overconfident. Liquid AI trained d1-ultra for calibration for this reason[^liquid-ultra]. Strands Decider reports that its answers with a confidence of 0.9 or more are right about 95% of the time on unseen short tasks[^strands-repo].

## Use at masseater.dev

masseater.dev uses decision models in [oxlint-plugin-decision](/sloppedia/oxlint-plugin-decision), a lint plugin that has a model judge rules written in natural language. The plugin accepts only Jev and Clef, and its default is Clef Flash through a capped AI Gateway. It rejects chat models by type and by test.

The owner also measures how well decision models work in Japanese with [mst-ja-decision-bench](https://masseater.dev/decision-bench/). In the run of October 11, 2026, Liquid d1 ranked third of 16 models, and Clef Flash ranked eleventh. Every model lost about 20 points of accuracy on Japanese business rules compared with English.

The owner of Sloppedia, masseater, thinks decision models are cheap and fast enough to run on every lint and every workflow step. masseater also thinks they cannot yet be trusted with Japanese rules that combine several clauses.

[^typesafe-launch]: TypeSafe AI, "[Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)", September 15, 2026.

[^typesafe-name]: TypeSafe AI, "[Don't Call It a Decision Model](https://typesafe.ai/blog/dont-call-it-a-decision-model)", November 3, 2026.

[^typesafe-docs]: TypeSafe AI, "[Models](https://docs.typesafe.ai/models)". Read on November 18, 2026.

[^clef-changelog]: Cloudflare, "[Clef on Workers AI](https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/)", October 1, 2026.

[^clef-docs]: Cloudflare, "[clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)". Read on November 18, 2026.

[^liquid-d1]: Liquid AI, "[Introducing d1](https://www.liquid.ai/blog/d1-decision-model)", October 5, 2026.

[^liquid-ultra]: Liquid AI, "[d1-ultra](https://www.liquid.ai/blog/d1-ultra)", October 15, 2026.

[^liquid-docs]: Liquid AI, "[Decision Models](https://docs.liquid.ai/lfm/models/decision-models)". Read on November 18, 2026.

[^strands-repo]: Strands Labs, "[strands-decider](https://github.com/strands-labs/strands-decider)", GitHub. Read on November 18, 2026.

[^marktechpost-strands]: MarkTechPost, "[AWS Strands Labs Releases Strands Decider 2B](https://www.marktechpost.com/2026/10/01/aws-strands-labs-releases-strands-decider-2b/)", October 1, 2026.

[^gemini-blog]: Google, "[Gemini Decisions API](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/)", November 11, 2026.

[^pplx-x]: Aravind Srinivas, "[Decider v1.3 and Decider Flash v1.3](https://x.com/AravSrinivas/status/2121020114321703210)", X, November 2026.

[^openrouter-models]: OpenRouter, "[Models](https://openrouter.ai/models)". Read on November 18, 2026.

[^aa-v2]: Artificial Analysis, "[Introducing the Artificial Analysis Decision Index v2](https://artificialanalysis.ai/articles/decision-index-v2)", November 8, 2026.

[^decidebench]: choyiny, "[DecideBench](https://github.com/choyiny/decidebench)", GitHub. Read on November 18, 2026.
