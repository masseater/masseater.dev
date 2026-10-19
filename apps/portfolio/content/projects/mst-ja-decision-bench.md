---
title: mst-ja-decision-bench
description: decision model が日本語のタスクをどれだけ正しく判定できるかを測るベンチマーク
date: 2026-10-11
tags: [decision-model, benchmark, openrouter]
published: true
---

選択肢・はい／いいえ・スコアだけを返す decision model が、日本語のタスクをどれだけ正しく判定できるかを測っている。日本語で使う decision model を選ぶときに、正しさと費用と速度を並べて比べられる。

結果は[リーダーボード](https://masseater.dev/decision-bench/)で公開している。正解ラベルは JNLI を除いて Claude Opus 5.5 が付けたもので、スコアは本当の正しさではなく Opus 5.5 のラベルとの一致率である。勉強目的の実験なので、結果は参考程度に見てほしい。

ソースは [GitHub](https://github.com/masseater/mst-ja-decision-bench) にある。
