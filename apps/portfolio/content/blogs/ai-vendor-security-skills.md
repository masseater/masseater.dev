---
title: "AI大手各社の公式セキュリティスキルを調べた"
description: "Cloudflare の security-audit-skill をきっかけに、AI大手各社が公式に出しているセキュリティ系 Agent Skills を全部当たってみた。出している会社の顔ぶれと、出していない会社の方が意外だった。"
date: 2026-10-25
tags: ["AI", "セキュリティ", "Agent Skills"]
published: true
---

Cloudflare が `security-audit-skill` という、コードベースのセキュリティ監査をエージェントにやらせるスキルを公開している[^cloudflare-skill]。これを見て、他の AI 大手は同じようなものを出しているのか気になった。公式の GitHub オーガニゼーションと公式ドキュメントだけを当たって、各社のセキュリティ系 Agent Skills（SKILL.md 形式のもの）を洗い出した。

出しているのは Cloudflare、OpenAI、Google、Sentry など。出していない組の方が意外で、Anthropic 自身がスキル形式では出していなかった。

## 一覧

| 発行元             | 置き場                          | セキュリティ系スキル                                                         | ライセンス               |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| Cloudflare         | cloudflare/security-audit-skill | `security-audit`（単体）                                                     | MIT                      |
| OpenAI             | openai/skills                   | `security-best-practices`、`security-threat-model`、`security-ownership-map` | Apache-2.0（スキルごと） |
| Google             | google/skills                   | `google-cloud-waf-security` ほか Security and identity 分類の約21本          | Apache-2.0               |
| Google（Firebase） | firebase/agent-skills           | `firebase-security-rules-auditor`                                            | Apache-2.0               |
| Sentry             | getsentry/skills                | `security-review`、`gha-security-review`、`skill-scanner` など7本            | Apache-2.0               |
| Trail of Bits      | trailofbits/skills              | セキュリティ系プラグイン約35本                                               | CC BY-SA 4.0             |
| GitHub             | github/awesome-copilot          | `mcp-implementation-security-review`                                         | MIT                      |
| Cisco              | CiscoDevNet/skills              | セキュリティ製品の運用系（sccfm、Splunk ES など）                            | Apache-2.0               |

## Cloudflare：単体で一番ガチなやつ

`security-audit` は単体のスキルで、コレクションの一部ではない。2026年6月18日の公式ブログ「Build your own vulnerability harness」と一緒に出た[^cloudflare-blog]。Cloudflare 社内の128リポジトリを走査する脆弱性発見ハーネスの種になったものだという。

中身は監査の作法そのものだ。普段は質問に答える Guidance モードで、監査やペンテストを明示されたときだけ6フェーズの完全な監査を回す。偵察でアーキテクチャと調べる範囲の一覧を作り、その一覧に沿ってハンター役のエージェントが候補を挙げ、候補は必ず「見つけた本人ではない、反証を試みる検証役」に回す。結論は confirmed / needs_validation / rejected の3値で、確証が取れないものには深刻度を付けない。対象コードを実行していいのは OS レベルのサンドボックスの中だけ、という線引きまで書いてある。

スキルというとプロンプトの束のイメージが強いが、これは運用の型を配っている。反証役を分ける、証拠が無ければ格付けしない、といった監査の規律を SKILL.md と検証スクリプトで固定する発想だ。

## OpenAI：3本あるが、置き場は deprecated

Codex 向けの `openai/skills` に3本ある[^openai-skills]。言語・フレームワーク別のセキュアコーディングとレビューをする `security-best-practices` と、リポジトリに即した脅威モデリングを書く `security-threat-model` だ。もう1本は、git の履歴から機微なコードの所有者とバスファクターを出す `security-ownership-map` である。

ただしリポジトリ自体に deprecated のバナーが出ていて、後継は `openai/plugins` とされている。3本がそちらへ移るのかは確認できなかった。

## Google：数は最多級、ただし Google Cloud の話

`google/skills` には Security and identity という分類があり、約21本ある[^google-skills]。中心は Well-Architected Framework のセキュリティ柱に沿ってクラウドのワークロードを評価する `google-cloud-waf-security` だ。あとは Google SecOps の検知・トリアージ系、Security Command Center の修復系、IAM のトラブルシュート系が並ぶ。コードの脆弱性監査というより、Google Cloud を守るための運用スキル集だ。

別枠で Firebase チームの `firebase/agent-skills` に `firebase-security-rules-auditor` がある[^firebase-skills]。Firestore と Cloud Storage のセキュリティルールを、権限昇格や更新バイパスのチェックリストで監査して1〜5で採点する。対象がルールファイルに絞られている分、使いどころがはっきりしている。

## Sentry：自分たちの開発スキルをそのまま公開

Sentry は社内のエンジニアリングスキル集 `getsentry/skills` を公開していて、その中に7本ある[^sentry-skills]。OWASP 観点の `security-review` は、自信度の高い悪用可能なものだけを報告せよという指示が印象的だった。ほかに GitHub Actions の悪用を見る `gha-security-review` と、エージェントスキル自体をスキャンする `skill-scanner` がある。シークレットがシリアライズやログに漏れる形を探す `secret-serialization` も入っている。どれも地味だが、現場の匂いがする。

## Trail of Bits：最大規模、ただしセキュリティ専門会社

AI 大手ではないが、セキュリティ専門会社の Trail of Bits が約35本のプラグインを出している[^tob-skills]。スマートコントラクト、CodeQL や Semgrep を使う静的解析、サプライチェーン監査、YARA ルール作成まで範囲が広い。ライセンスが他社の MIT / Apache と違って CC BY-SA 4.0（継承）なので、業務で組み込むときはそこだけ注意が要る。

## GitHub と Cisco：毛色の違う2つ

GitHub の `github/awesome-copilot` には MCP サーバーやクライアントの実装を OWASP MCP Top 10 などで点検する `mcp-implementation-security-review` がある[^github-skills]。ただしこのリポジトリはコミュニティ投稿の集合で、GitHub 自身が書いたものではない。Copilot の `/security-review` は製品機能であって、SKILL.md として公開されたものではない。

Cisco の `CiscoDevNet/skills` にあるのは、コードを監査するスキルではなく Cisco や Splunk のセキュリティ製品を操作するスキルだ[^cisco-skills]。同じ「セキュリティスキル」でも意味が違う。

## 出していなかった組

Anthropic の `anthropics/skills` には全19本の中にセキュリティ系が無い[^anthropic-skills]。代わりに、PR の差分を走査する GitHub Action の `claude-code-security-review` と、Claude Code 組み込みの `/security-review` コマンドで出している。スキル形式を広めた本人が、セキュリティについては別の配り方を選んでいるのが面白い。

Microsoft の `microsoft/skills`（約175本）にも監査系は無く、あるのは Entra や Key Vault の SDK の使い方スキルだけだった。NVIDIA はスキル自体をスキャンするツール SkillSpector を出しているが、セキュリティスキルは無い。Hugging Face と Vercel も確認できなかった。Vercel はスキル配布の基盤である skills.sh と `npx skills` の運営側に回っている。

## まとめ

各社で「セキュリティスキル」の指すものがかなり違う。Cloudflare と OpenAI はコードを読む監査・レビューの型、Google はクラウド運用、Sentry は自分たちの開発現場の型、Cisco は自社製品の操作だ。同じ SKILL.md という器でも、中身はその会社の本業の写し絵になっている。

個人的に一番持ち帰る価値があったのは、Cloudflare の「検証役は発見者と分ける」「証拠が無ければ深刻度を付けない」という規律だった。スキルは、プロンプトの束から仕事の作法を配る形へ移りつつある。

[^cloudflare-skill]: Cloudflare, security-audit-skill https://github.com/cloudflare/security-audit-skill

[^cloudflare-blog]: Cloudflare Blog「Build your own vulnerability harness」（2026年6月18日） https://blog.cloudflare.com/build-your-own-vulnerability-harness/

[^openai-skills]: OpenAI, openai/skills https://github.com/openai/skills

[^google-skills]: Google, google/skills https://github.com/google/skills

[^firebase-skills]: Firebase, firebase/agent-skills https://github.com/firebase/agent-skills

[^sentry-skills]: Sentry, getsentry/skills https://github.com/getsentry/skills

[^tob-skills]: Trail of Bits, trailofbits/skills https://github.com/trailofbits/skills

[^github-skills]: GitHub, github/awesome-copilot https://github.com/github/awesome-copilot

[^cisco-skills]: Cisco, CiscoDevNet/skills https://github.com/CiscoDevNet/skills

[^anthropic-skills]: Anthropic, anthropics/skills https://github.com/anthropics/skills と claude-code-security-review https://github.com/anthropics/claude-code-security-review
