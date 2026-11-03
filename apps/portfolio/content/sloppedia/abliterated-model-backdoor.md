---
title: "abliterated モデルのバックドア実証"
description: "ProjectDiscovery が、拒否を外した abliterated モデルにトリガー付きのバックドアを仕込み、コーディングエージェント経由で秘密情報を外へ送らせた実証。"
tags: ["セキュリティ", "大規模言語モデル"]
published: true
---

**abliterated モデルのバックドア実証**は、セキュリティ企業の ProjectDiscovery が公開した、拒否の仕組みを取り除いた（abliterated）言語モデルに悪意ある挙動を仕込めることを示した実験である[^projectdiscovery]。

## 概要

ProjectDiscovery は Qwen2.5-7B に約8ドルの費用でトリガー付きのバックドアを仕込み、Codex CLI を通じて `.env` の中身を外部へ送信させた[^projectdiscovery]。

## 評価

この実証は、ベンチマークの点数ではバックドアを見抜けないため、モデルを動かす実行環境の側で隔離することが防御の要になると結論づけている[^projectdiscovery]。

[^projectdiscovery]: ProjectDiscovery「[How abliterated models can get you pwned](https://projectdiscovery.io/research/how-abliterated-models-can-get-you-pwned)」ProjectDiscovery Research。
