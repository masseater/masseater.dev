---
title: "コドモンの PHP2Shell 対応"
description: "コドモンが PHP2Shell の修正版の公開前に主要サービスを予防的に止め、自前でビルドした PHP で翌朝に再開した対応。"
tags: ["セキュリティ", "PHP"]
published: true
---

**コドモンの PHP2Shell 対応**は、保育・教育施設向けサービスを運営するコドモンが、PHP の脆弱性 PHP2Shell に対して取った対応である。同社が振り返りの記事を公開した[^codmon]。

## 経緯

コドモンは PHP2Shell の修正版が公開される前に、主要なサービスを予防的に停止した。その後、自前でビルドした PHP に入れ替えて、翌朝にサービスを再開した[^codmon]。

[^codmon]: コドモン「[PHP2Shellへの対応を振り返って](https://tech.codmon.com/entry/2026/10/23/173909)」コドモン Product Team Blog。
