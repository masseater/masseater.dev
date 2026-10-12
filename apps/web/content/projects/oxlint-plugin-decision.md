---
title: oxlint-plugin-decision
description: 自然言語で書いたルールを decision model に判定させる Oxlint プラグイン。
date: 2026-09-18
tags: [decision model, oxlint, lint]
published: true
---

Oxlint のルールを、英語の質問文で書けるようにするプラグインである。
対象の関数や呼び出し、JSX 要素、ファイルを OpenRouter 経由で decision model に渡し、答えの確率がしきい値を超えたら lint エラーにする。

ログへの個人情報の出力や、ハードコードされた秘密情報を見つけるルールをプリセットとして同梱している。
キャッシュされていない判定はモデルへのリクエストになるので、変更したファイルだけに使う想定である。

ソースは [GitHub](https://github.com/masseater/oxlint-plugin-decision) にある。
