---
title: "typescript-template: Cloudflare で動く TypeScript アプリを検査と CI がそろった状態から始める"
description: "Cloudflare で動く TypeScript の Web アプリを、検査・CI・デプロイ・AI エージェントとの作業の決まりがそろった状態から始めるための GitHub テンプレート。何が入っていて、使うと何が起きるかを紹介する。"
date: 2026-10-24
tags: ["TypeScript", "Cloudflare", "Claude Code"]
published: true
---

GitHub テンプレート [typescript-template](https://github.com/masseater/typescript-template) を公開している。Cloudflare で動く TypeScript の Web アプリを、検査・CI・デプロイ・AI エージェントとの作業の決まりがそろった状態から始めるためのものである。新しいリポジトリを作るたびに lint や CI やデプロイを組み直す手間をなくすために作った。[テンプレートのままのアプリ](https://typescript-template-web-production-ntesuocc46gilfjl.masseater.workers.dev)も動いている。

このテンプレートは、コードを書くのは主に AI エージェントだという前提で組んでいる。人間が決めるのは、何を使い、何を禁止し、何を検査するかである。何が入っているかを順に紹介する。

## アプリの構成

| 役割                           | 使うもの                        |
| ------------------------------ | ------------------------------- |
| 画面                           | TanStack Start                  |
| API                            | Elysia                          |
| データベース                   | Cloudflare D1 を Drizzle で扱う |
| 認証                           | better-auth                     |
| UI                             | shadcn/ui                       |
| UI 状態                        | effect-atom                     |
| サーバー状態                   | TanStack Query                  |
| 検証・日時・ログ・トレーシング | Effect                          |

API は Elysia で書き、そのクライアントである Eden の型から TanStack Query のクエリを作る。API の型を書き写す場所がないので、クライアントとサーバーの型は常に一致する。UI 状態とサーバー状態は別のライブラリに分け、どちらが持つ値かを曖昧にしない。検証、日時、ログ、トレーシングは Effect に寄せ、用途ごとに別のライブラリを足さない[^structure]。

アプリの中は Feature-Sliced Design で切る。使われる場所の近くに置き、再利用されるまで切り出さない。

## インフラ

Cloudflare のリソースは [Alchemy](https://alchemy.run) でコードとして定義し、wrangler は使わない。D1 と Worker の定義が 1 ファイルにあり、アプリ名を一か所変えればリソース名がそろう[^alchemy]。

本番の Worker には最初から守りと記録が付いている。独自ドメインのゾーンを持つリポジトリでは、WAF のカスタムルールで脆弱性スキャナが探る典型的なパスへのアクセスを遮断する。一部のパスはハニーポットとして残し、どこから何を探ってきたかを Analytics Engine に記録する。すべての Worker に logpush を付け、ログを外に残す[^edge-guard]。Workers Paid プランが前提である。

## 検査

`vp run verify` の 1 コマンドで全部走る。型検査、lint、テスト、依存の監査、dead code の検出、GitHub Actions のワークフロー自体の検査、Markdown の文章検査まで含む[^verify]。文章の検査には、日本語の技術文書向けのルールと、AI が書いた文章にありがちな表現を検出するルールが入っている。

lint の方針は次の表のとおりである。

| 方針                                              | 仕組み                                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 使うライブラリの公式ルールをすべて error で入れる | warning は 1 件も残さない。ライブラリの作者が「こう使うな」と言っているものをそのまま強制する                                                     |
| 採用しなかったライブラリの import を禁止する      | import した時点で違反になり、代わりに何を使うかが表示される。CLAUDE.md に「使わない」と書くより確実に止まる[^restricted]                          |
| AST で判定できない決まりは LLM に判定させる       | 自作の [oxlint-plugin-decision](https://www.npmjs.com/package/@r_masseater/oxlint-plugin-decision) がファイル単位で LLM に判定を求める[^decision] |

「状態は排他的な status を持つ判別共用体で表し、boolean フラグの組を使わない」のような決まりは、構文では捕まえられない。これが LLM に判定させている決まりの例である。LLM が lint を担うと、判定がぶれないかという不安がある。そこで、確信できるものだけを違反とし、閾値を下げて取りこぼしを拾いにいかないと決めている。ルール化の前に、正解の分かる違反例と非違反例で判定できるかを確かめる。

コード内コメントは禁止している。「なぜ」はコミットメッセージに書く[^docs]。コードを読めば分かることを書かない、という方針の延長で、説明が古くなる場所を減らしている。

## CI とデプロイ

PR ごとの CI はない。main に push されると verify が走り、通ればそのまま本番にデプロイされる。動作は本番で確かめる、という順序である[^workflow]。

デプロイしたあとの本番も計測する。

| 計測                       | いつ             | 結果の扱い                                                                                    |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| Lighthouse の Web Vitals   | デプロイ直後     | 合格点に届かなければワークフローを失敗にする                                                  |
| ZAP のベースラインスキャン | 週に 1 回        | 警告も含めて直す                                                                              |
| CI のジョブごとの所要時間  | ワークフローごと | 自前の Worker で受けて Workers Logs に残す。CI が遅くなったときに原因のステップを後から追える |

verify が失敗したときは、autofix ワークフローが起動し、Claude が失敗したログを読んで修正ブランチを作る。依存の更新は Renovate が automerge し、リリースは release-please が切る[^automation]。人間が定期的に手を動かす箇所をなくしている。

## AI エージェントとの作業の決まり

CLAUDE.md の最上位原則は、何かを強制・推奨したいときの手段の選び方である[^principle]。

1. ライブラリ公式の統合手段（lint ルール、skill、plugin、CLI など）
2. それを実現している既存のライブラリやツール
3. 方針を提言しているブログ・issue・discussion
4. 自作

自作は最後である。あわせて、検査を通すための設定の無効化や簡易化、閾値の引き下げ、抑止ディレクティブの使用を禁じている。エージェントに任せると最初に起きるのが「lint を off にして通す」だからである。

この決まりは文章で書くだけでなく、Claude Code のフックで機械的に守らせる[^hooks]。

| タイミング       | 動くもの                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| セッション開始時 | 依存のインストール。テンプレートの新しいリリースがあれば知らせる                                                                      |
| ファイル編集後   | fallow で dead code と依存を検査する                                                                                                  |
| 作業終了時       | verify を走らせ、通らなければ終了をブロックする                                                                                       |
| 作業終了時       | 別のエージェントが差分を審査する。検査の緩和、自作の正当性、Feature-Sliced Design のコロケーション、Web 標準の使い方の 4 つの目で見る |

さらに `/loop` という自己改善ループがある[^loop]。セッションごとに、使っているライブラリやツールについてまだ適用していないより厳しい検査手段を探し、意図的な違反で失敗し、戻すと通ることを確かめてから足す。テンプレートは配った時点で止まらず、使うたびに厳しくなる。

## テンプレートの更新を取り込む

テンプレートから作ったリポジトリは、元のテンプレートが更新されても放置されがちである。ここでは release-please でテンプレートにバージョンを切り、派生リポジトリで Claude Code のセッションを始めると、新しいリリースがあることと主な変更点が知らされる。取り込むと答えれば、前のリリースとの差分を当て、衝突を解消し、verify を通すところまでエージェントが進める[^release]。

## 関連

public リポジトリで開発する意義は[別の記事](/blogs/public-repo-development)に、public にすると無料になるものは[OSS 向け無償プランのまとめ](/blogs/oss-free-plans)に書いた。Effect を全面採用する理由は[AIにコードを書かせるならEffectを全面採用する](/blogs/effect-for-ai)にある。

[^structure]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「構成」「配置」「その他」と [DESIGN.md](https://github.com/masseater/typescript-template/blob/main/DESIGN.md)

[^alchemy]: [apps/web/alchemy.run.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/alchemy.run.ts)

[^edge-guard]: [apps/web/edge-guard.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/edge-guard.ts)

[^verify]: [vite.config.ts](https://github.com/masseater/typescript-template/blob/main/vite.config.ts) の `run.tasks.verify`

[^restricted]: [lint.config.ts](https://github.com/masseater/typescript-template/blob/main/lint.config.ts)

[^decision]: [decision-rules.ts](https://github.com/masseater/typescript-template/blob/main/decision-rules.ts)

[^docs]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「文書」

[^workflow]: [.github/workflows/verify.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/verify.yml)

[^automation]: [autofix.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/autofix.yml)、[zap.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/zap.yml)、[renovate.json](https://github.com/masseater/typescript-template/blob/main/renovate.json)

[^principle]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「最上位原則」

[^hooks]: [.claude/settings.json](https://github.com/masseater/typescript-template/blob/main/.claude/settings.json)

[^loop]: [.claude/loop.md](https://github.com/masseater/typescript-template/blob/main/.claude/loop.md)

[^release]: [.claude/hooks/template-release.ts](https://github.com/masseater/typescript-template/blob/main/.claude/hooks/template-release.ts)
