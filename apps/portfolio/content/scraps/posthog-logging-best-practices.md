---
title: "PostHog のログのベストプラクティス"
description: "PostHog のログのベストプラクティスは、INFO ログはリクエストごとに 1 件の wide event にまとめ、細かい DEBUG は調べるときだけ有効にせよという内容である。構造化ログ、高カーディナリティなフィールドの扱い、エラーと遅いリクエストを残す tail sampling にも触れている。"
date: 2026-10-30
tags: ["logging","observability","posthog"]
published: true
---

PostHog の[ログのベストプラクティス](https://posthog.com/docs/logs/best-practices)は、INFO ログはリクエストごとに 1 件の wide event にまとめ、細かい DEBUG は調べるときだけ有効にせよという内容である。構造化ログ、高カーディナリティなフィールドの扱い、エラーと遅いリクエストを残す tail sampling にも触れている。
