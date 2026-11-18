---
title: "mst-ja-decision-bench, a benchmark that measures decision models in Japanese"
description: "Bothered that decision models are not as accurate in Japanese as in English, I built mst-ja-decision-bench, a benchmark that measured 16 models on JNLI and on judgments against fictional company rules. Here is what is in it and what it found."
tags: ["decision-model", "ベンチマーク", "OpenRouter"]
published: true
---

A decision model is a model that does not generate text, and only returns a choice, a yes or no, or a score, with probabilities. It can be called from [OpenRouter](https://openrouter.ai/) for less than 0.0001 USD per call and in around 200 ms. At this cost and speed, judgments that used to be left to people or large LLMs, such as "does this function write personal information to the logs," can be run every time as parts of lint and workflows. I feel this potential quite strongly, and have built things such as [oxlint-plugin-decision](https://github.com/masseater/lint-kit/tree/main/libs/oxlint-plugin-decision), which has decision models judge rules written in natural language.

However, when the questions of the rules or the texts being judged were in Japanese, performance was clearly lower. I wanted to know how accurate models that score over 90% in English evaluations are in Japanese, and which models can be used in Japanese, so I decided to measure it myself. That is [mst-ja-decision-bench](https://github.com/masseater/mst-ja-decision-bench), and the results are published on a [leaderboard](https://masseater.dev/decision-bench/).

## The gap with English

For the 6 models that are also on the English public benchmark [DecideBench](https://github.com/choyiny/decidebench), I lined up the accuracy in English and the accuracy on this benchmark's business rule judgments. Both pair up cases that differ in only one place, and the pair accuracy is the share of pairs where both cases were answered correctly.

| Model                | English accuracy | Japanese accuracy | English pair accuracy | Japanese pair accuracy |
| -------------------- | ---------------: | ----------------: | --------------------: | ---------------------: |
| Jev 1.13             |             98.0 |              77.5 |                  96.0 |                   55.5 |
| GPT-6 Luna Decisions |             97.3 |              75.9 |                  94.5 |                   52.2 |
| Clef                 |             94.0 |              75.3 |                  88.0 |                   51.0 |
| Drex v1.5            |             90.0 |              68.8 |                  80.5 |                   37.2 |
| Clef Flash           |             85.3 |              64.6 |                  72.0 |                   32.0 |
| Kev 4B               |             78.3 |              59.0 |                  65.5 |                   19.0 |

Every model drops about 20 points in accuracy and about 40 points in pair accuracy. The English set is 400 Choice questions, and the Japanese set is 500 questions answered with yes or no. Because the content and format of the questions differ, not all of the gap can be blamed on the language. The ranking of the models is the same as in English, but even models that exceed 90% in English stay in the 50% range for pair accuracy in Japanese.

## Two tasks

The first is JNLI from [JGLUE](https://github.com/yahoojapan/JGLUE), which asks the model to choose whether the relation between two sentences is entailment, contradiction or neutral. It is an existing dataset with answers given by people, so my judgment does not enter the scoring.

The second, business rule judgment, consists of the internal rules of a fictional company that I had Claude Opus 5.5 make, and 500 cases asking whether they comply with those rules. Like lint rules, it is a problem of reading the rules and judging whether the case in front of you applies. The following two cases are from the expense reimbursement rules; only the number of attendees at the business dinner differs, and the answers are opposite.

> 営業課の一般職の社員が取引先との会食費3万円を立て替えた。出席者は取引先2名と自社2名の計4名だった。社員は会食の翌週、領収書の写しを添付して経費精算システムで申請した。事前に部長の承認は得ておらず、所属長の営業課長が精算を承認し、経理部が確認して支払った。

The other case is 「取引先1名と自社1名の計2名」, and the question for both is 「この取引先との会食費の精算は、承認の手続きを含めて規程に適合しているか」. The rules have a clause saying that food and drink with business partners is limited to 10,000 yen per person, and that going over requires a department manager's approval in advance. With 4 people it is 7,500 yen per person and complies, and with 2 people it is 15,000 yen per person and does not. Every case, like this one, cannot be judged without combining two or more clauses of the rules.

The answer labels for business rule judgment were given by Opus 5.5, so the score is not true correctness but the rate of agreement with Opus 5.5's labels. I also had Opus 5.5 label 200 JNLI items, and it agreed with the human answers 91.5% of the time. I use this number as a rough guide to how often Opus 5.5's labels are wrong.

## Scoring

The scoring rules follow the [Jev Decision Index](https://huggingface.co/spaces/multimodalart/jev-decision-index): the question text is the same for all models, and abstentions and errors are counted as wrong. The skill in the tables is a value where answering at random is 0 and getting every question right is 100. In business rule judgment, yes and no are half and half, so even answering arbitrarily gives an accuracy of around 50%, and differences between models are hard to see in raw accuracy. With skill, models that cannot be told apart from random come close to 0.

## Results

Here are the results of measuring all items for 16 models on October 11, 2026, ordered by the average of the skill on the two tasks (the index).

| Model                | Index | JNLI skill | Business rule skill | Business rule pair accuracy | Cost for all tasks (USD) |
| -------------------- | ----: | ---------: | ------------------: | --------------------------: | -----------------------: |
| Decider V1.1 27B     |  80.7 |       85.4 |                75.9 |                        76.1 |                   0.0178 |
| Mercury Decide       |  75.3 |       84.5 |                66.2 |                        69.2 |                   0.0167 |
| Liquid d1            |  67.3 |       83.2 |                51.3 |                        52.2 |                   0.0312 |
| Solar Decide         |  65.4 |       58.2 |                72.7 |                        73.3 |                   0.0843 |
| Jev 1.13             |  64.0 |       73.1 |                55.0 |                        55.5 |                   0.0826 |
| Clef                 |  61.3 |       72.0 |                50.5 |                        51.0 |                   0.2482 |
| Microsoft-Decision-1 |  55.0 |       70.8 |                39.3 |                        40.9 |                   0.0308 |
| Drex v1.5            |  53.4 |       69.2 |                37.6 |                        37.2 |                   0.0281 |
| GPT-6 Luna Decisions |  53.4 |       55.1 |                51.6 |                        52.2 |                   0.1193 |
| Clef Omni            |  44.2 |       61.6 |                26.8 |                        29.6 |                   0.1746 |
| Clef Flash           |  42.4 |       55.6 |                29.2 |                        32.0 |                   0.0393 |
| Tev1 4B Experimental |  42.0 |       68.4 |                15.5 |                        18.6 |                   0.0386 |
| Kev 4B               |  40.1 |       62.3 |                17.9 |                        19.0 |                   0.0295 |
| Solar Decide Flash   |  32.1 |       47.5 |                16.7 |                        18.6 |                   0.0843 |
| span-01              |  11.6 |       10.9 |                12.2 |                        13.8 |                   0.0182 |
| span-01 lite         |  11.6 |       10.9 |                12.2 |                        13.8 |                   0.0000 |

The model that did best in Japanese was Perplexity's Decider V1.1 27B. However, as of October 27, 2026, this model has no provider at all on OpenRouter and cannot be called. Among the models that can be called now, Inception's Mercury Decide is near the top on both tasks, and it is also the cheapest of the paid models. Upstage's Solar Decide has a high business rule skill of 72.7, but its median response time on that task is 18.7 seconds, orders of magnitude slower than the other models, which answer in around 200 ms.

span-01 and span-01 lite have a skill of around 11, hardly different from answering at random. span-01 lite is free and is also the model used for oxlint-plugin-decision's own lint, so this result showed that it is not suited to judging questions in Japanese. These two accept only yes or no, so for JNLI the question is split into a yes or no question for each choice, and the choice with the highest probability of yes is taken as the answer.

Some models swap places greatly between JNLI and business rule judgment. Tev1 4B Experimental and Kev 4B have a JNLI skill above 60, but do not reach 20 in business rule judgment. They can solve problems that only look at the relation between two sentences, but fall apart on problems that require reading long rules and combining clauses.

## Costs

The cost of having the 16 models answer every question of both tasks was 1.04 USD in total. Giving the answer labels cost far more: labeling by asking Opus 5.5 each question three times comes to 37.88 USD at API prices. Questions where the three answers split were counted as hard, separately from the numbers in the tables.

The models' responses and the answer labels are committed to the repository, so measuring again does not need Opus 5.5, and queries to OpenRouter are needed only for newly added models.
