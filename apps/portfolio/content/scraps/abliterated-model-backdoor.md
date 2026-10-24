---
title: "abliteratedモデルのバックドア実証"
description: "ProjectDiscoveryのHow abliterated models can get you pwned。Qwen2.5-7Bに約8ドルでトリガー付きバックドアを仕込み、Codex CLI経由で.envを外部送信させた実証で、ベンチでは見抜けないので実行環境側の隔離が要になる。"
date: 2026-10-24
tags: ["security","llm"]
published: true
---

ProjectDiscoveryの[How abliterated models can get you pwned](https://projectdiscovery.io/research/how-abliterated-models-can-get-you-pwned)。Qwen2.5-7Bに約8ドルでトリガー付きバックドアを仕込み、Codex CLI経由で.envを外部送信させた実証で、ベンチでは見抜けないので実行環境側の隔離が要になる。
