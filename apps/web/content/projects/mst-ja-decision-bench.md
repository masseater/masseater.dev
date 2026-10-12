---
title: mst-ja-decision-bench
description: 選択・二値・スコアだけを返す decision model を、日本語のタスクで測るベンチマーク。
date: 2026-10-11
tags: [decision model, benchmark]
published: true
---

選択・二値・スコアだけを返す decision model を、日本語のタスクで測るベンチマークである。
正解ラベルは Claude Opus 5.5 で付け、そのラベルとの一致率でモデルを並べている。

スコアは Opus 5.5 のラベルとの一致率であり、本当の正しさではない。
勉強目的の実験なので、結果は参考程度に見てほしい。

結果は [ベンチマークのサイト](/decision-bench) で公開している。
ソースは [GitHub](https://github.com/masseater/mst-ja-decision-bench) にある。
