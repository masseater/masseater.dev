---
title: cc-jev-teacher
description: decision model で Claude Code のツール呼び出しと完了報告を採点し、やり直させるプラグイン。
date: 2026-09-28
tags: [decision model, claude-code-plugin]
published: true
---

Claude Code に作業を任せると、デプロイ前に「完了」と報告したり、lint のルールを切って通したりすることがある。
cc-jev-teacher は、危ないツール呼び出しと最後の報告を decision model に採点させ、問題があれば hook で止めて直す点を伝える。

同じリポジトリの cc-jev-pruner は、要約なしの compact や長い Bash 出力の切り詰めで、Claude のコンテキストを小さく保つ。
どちらも既定では無料の Respan Span-01 Lite を使う。

ソースは [GitHub](https://github.com/masseater/cc-jev-teacher) にある。
