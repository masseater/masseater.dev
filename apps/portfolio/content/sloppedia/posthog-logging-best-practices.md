---
title: "PostHog のログのベストプラクティス"
description: "PostHog が公開している、INFO ログをリクエストごとの wide event にまとめるよう勧めるログの指針。"
tags: ["ログ", "オブザーバビリティ", "PostHog"]
published: true
---

**PostHog のログのベストプラクティス**は、PostHog が公式の文書で公開しているログの指針である[^posthog]。

## 内容

INFO のログはリクエストごとに1件の wide event にまとめ、細かい DEBUG のログは調べるときだけ有効にせよと勧めている[^posthog]。

構造化ログ、カーディナリティの高いフィールドの扱い、エラーと遅いリクエストを残す tail sampling にも触れている[^posthog]。

[^posthog]: PostHog「[Logging best practices](https://posthog.com/docs/logs/best-practices)」PostHog Docs。
