---
title: "public リポジトリと OSS に開放されている無償プラン（2026年10月）"
description: "GitHub Actions の CI 代をはじめ、リポジトリを public にすると無料になるもの、メンテナ個人に付く無償プラン、他社の OSS プログラムを 2026年10月時点の公式ページで確認してまとめた。"
date: 2026-10-24
tags: ["GitHub Actions", "OSS", "CI"]
published: false
---

AI エージェントに開発をさせると、PR 1 本ごとにテスト、lint、ビルド、AI レビューが走り、CI の消費量が人が書いていた頃と桁で変わる。この CI 代を含めて、リポジトリを public にすると何が無料になるのか、メンテナ個人には何が付くのか、GitHub 以外の OSS プログラムは何を出しているのかを、2026年10月23日時点の各社公式ページで確認した。

## まず結論

- リポジトリを public にして OSI ライセンスを置くだけで、申請なしに無料になるもの: GitHub Actions の標準ランナー、ghcr.io、CodeQL、secret scanning、Dependabot、Codecov、SonarQube Cloud、CodeRabbit
- 本人の実績で判定される無償プラン: Copilot Pro、Claude Max 20x（6 か月）、JetBrains All Products Pack
- public にしても増えないもの: Codespaces
- 残る費目は AI レビューの推論代だけになる

## GitHub 本体で public なら無料になるもの

### GitHub Actions

[課金ドキュメント](https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-actions)の要点を public と private で並べる。

| 項目 | public | private（Free プラン） |
|---|---|---|
| 標準ランナー（GitHub ホスト） | 無料、分数上限なし | 月 2,000 分（Pro は 3,000 分） |
| larger runner（4 コア以上） | 課金 | 課金 |
| セルフホストランナー | 無料 | 無料 |
| Artifact ストレージ | 無料 | 500 MB（Packages と共有） |
| キャッシュ | 10 GB / リポジトリ | 10 GB / リポジトリ |

larger runner は「プランに未使用の分数が残っていても public でも常に課金」と明記されている。無料になるのは標準ランナーだけである。

private で枠を超えたときの[単価](https://docs.github.com/en/billing/concepts/product-billing/github-actions)は次の通り。

| ランナー | 単価 |
|---|---|
| Linux 2 コア x64 | 0.006 ドル / 分 |
| Linux 2 コア arm64 | 0.005 ドル / 分 |
| Linux 1 コア（slim） | 0.002 ドル / 分 |
| Windows 2 コア | 0.010 ドル / 分 |
| macOS 3〜4 コア | 0.062 ドル / 分 |

月 2,000 分は 33 時間強で、エージェントが 1 日に数十本の PR を出す運用なら数日で使い切る量である。

[上限](https://docs.github.com/en/actions/reference/limits)は public と private で区別がなく、プランだけで決まる。

- 同時実行ジョブ: Free 20、Pro 40、Team 60、Enterprise 500
- うち macOS: Free〜Team は 5、Enterprise は 50
- 1 ジョブの実行時間: 6 時間（セルフホストは 5 日）
- matrix: 1 実行あたり 256 ジョブ

### GitHub Packages と ghcr.io

[Packages の課金](https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-packages)は、public パッケージならストレージも転送も無料である。Container registry（ghcr.io）のイメージ保存と帯域は「現在は無料」という表現で、変更するときは 1 か月前に告知するとある。

private は Free プランで 500 MB と月 1 GB の転送しか含まれず、支払い方法を登録していないと枠を使い切った時点でブロックされる。

### セキュリティ機能

[GitHub Advanced Security の説明](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)によれば、public と private の差はここが最も大きい。

| 機能 | public | private |
|---|---|---|
| code scanning（CodeQL） | デフォルト有効、無料 | GitHub Code Security の購入が必要 |
| secret scanning / push protection | デフォルト有効、無料 | GitHub Secret Protection の購入が必要 |
| Dependabot alerts | 無料 | 無料 |
| Dependabot の premium 機能 | 無料 | GitHub Code Security が必要 |

Code Security と Secret Protection は Team 以上のプランでしか購入できない。個人の Free アカウントでは private リポジトリに CodeQL を掛ける手段がなく、public にした時点で使えるようになる。

### GitHub Pages

[Pages の上限](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)は、公開サイト 1 GB、帯域が月 100 GB、ビルドが 1 時間 10 回のソフトリミットである。カスタムの Actions ワークフローでビルドしていれば 10 回の制限は掛からない。

### Copilot code review

[Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review)の課金は二層になっている。

| 費目 | public | private |
|---|---|---|
| AI クレジット（レビュー本体） | 消費する | 消費する |
| Actions 分（コンテキスト収集で標準ランナーが動く） | 無料 | プランの分数から差し引き |

AI クレジットの目安は Lite effort で 1 回 0.05〜1 ドル、Balanced で 0.25〜5 ドルと書かれている。public にすると消えるのは Actions 分であって、推論代は消えない。

### Codespaces は増えない

[Codespaces の課金](https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-codespaces)は、個人 Free で月 120 コア時間と 15 GB 月、Pro で 180 コア時間と 20 GB 月である。リポジトリの公開設定とは無関係で、OSS 専用の枠もない。組織と Enterprise のプランには無料枠自体がない。

## メンテナ個人に付く無償プラン

### Copilot Pro

通常月 10 ドルの Copilot Pro は、[人気のある OSS リポジトリのメンテナに無料](https://docs.github.com/en/copilot/how-tos/manage-your-account/get-free-access-to-copilot-pro)で提供される。

- 基準は非公開
- Copilot 設定画面を開いて「GitHub Copilot Pro」のページが表示されれば対象
- 毎月再判定され、外れると有料プランか Copilot Free に戻る
- 申請手続きはない

### Claude for Open Source

[Claude for Open Source](https://claude.com/contact-sales/claude-for-oss)は、月 200 ドルの Claude Max 20x を 6 か月無料にする。条件は明文化されていて、次のいずれか 1 つを満たせばよい。

| 区分 | 条件 |
|---|---|
| メンテナ・ライブラリ作者 | 依存リポジトリ 500 以上、または依存パッケージ 100 以上、またはレジストリ合算の月間ダウンロード 20 万以上 |
| コアコントリビューター | CPython、Rust、Node.js TSC、Kubernetes、Django など財団・言語プロジェクトのコミッター |
| アクティブコントリビューター | 直近 12 か月で他人のリポジトリにマージされた PR が 100 本以上 |
| コミュニティビルダー | 自分のリポジトリのいずれかに、直近 12 か月でマージ済み PR を持つ外部コントリビューターが 20 人以上 |
| クリティカルインフラ | OpenSSF criticality score 0.4 以上 |

条件に届かなくても理由を書いて申請してよい、とページに書かれている。これはサブスクリプションであって API クレジットではないので、[Claude Code GitHub Action](https://github.com/anthropics/claude-code-action) を API キーで動かす分は別請求になる。

### JetBrains All Products Pack

[JetBrains の OSS ライセンス](https://www.jetbrains.com/shop/eform/opensource)は、プロジェクトリードかコアコントリビューターが申請し、非商用の OSS 開発に限って All Products Pack を 1 年単位で使える。アクティブかどうかは GitHub の履歴から自動で判定され、コード以外のコミットは活動と見なされない。2024 年には「少数のプロジェクトとの深い連携に集中するため更新しない」という[通知を受けた事例](https://github.com/karmada-io/community/discussions/184)が公開されている。

## GitHub 以外の CI

| サービス | OSS 向けの内容 | 条件 |
|---|---|---|
| [CircleCI](https://circleci.com/open-source/) | Linux / Arm / Docker に月 40 万クレジット（小さい Docker クラスで約 8 万分）、macOS / Windows に月 3 万クレジット | OSS プロジェクト |
| [GitLab for Open Source](https://docs.gitlab.com/subscriptions/community_programs/) | Ultimate 相当と月 5 万 compute 分 | namespace 全体が OSI ライセンスかつ public。セキュリティ用途の private プロジェクトを 1 つだけ許容。GitLab.com は審査が自動 |
| [Azure Pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/licensing/concurrent-jobs) | public プロジェクトは廃止。新規作成は不可、既存は 2027 年に private へ変換され、月 1,800 分・1 並列になる | なし |
| [Codemagic](https://codemagic.io/pricing/) | 個人プランで macOS M2 が月 500 分、1 並列。OSS 枠なし | なし |
| [Depot](https://depot.dev/pricing) | OSS 向け無償プランは非公開、問い合わせ | 不明 |

macOS のビルドが重い場合の逃げ道は CircleCI の OSS プランである。

## テスト・品質・セキュリティ

| サービス | public / OSS | private の無料枠 | 条件 |
|---|---|---|---|
| [Codecov](https://about.codecov.io/pricing/) | ユーザー数・アップロード数ともに無制限 | 1 ユーザー、月 250 アップロード | public であること |
| [SonarQube Cloud](https://www.sonarsource.com/plans-and-pricing/sonarcloud/) | Pro 相当を永続無料、Gitar AI Code Review 付き | 5 万行まで | OSI ライセンスの public リポジトリ |
| [Snyk](https://snyk.io/plans/) | Free プランは月あたり Open Source 200、Code 100、IaC 300、Container 100 テスト。OSS メンテナは別途申請可 | 同左 | 申請 |
| [BrowserStack](https://www.browserstack.com/open-source) | Live / Automate / Percy を 5 ユーザー・5 並列、プロジェクトが続く限り | なし | プロジェクト URL を添えて申請 |
| [Cypress Cloud](https://www.cypress.io/pricing) | 無料、OSS プランで月 10 万テスト結果 | 通常の Free 枠 | 非商用かつ public、申請 |
| [Chromatic](https://www.chromatic.com/pricing) | 月 5,000 スナップショットの一般 Free 枠。OSS 向け追加は問い合わせ | 同左 | 問い合わせ |

## AI コードレビュー

CI 代の次に効いてくるのがここで、推論代を誰が持つかで分かれる。

| サービス | OSS 向けの内容 | 推論代 | 有料プラン |
|---|---|---|---|
| [CodeRabbit](https://www.coderabbit.ai/pricing) | public リポジトリは無期限無料 | ベンダー持ち | Essentials 24 ドル / 人 / 月（年払い）、Team 48、Advanced 72 |
| [Greptile](https://www.greptile.com/pricing) | 非商用・OSI ライセンスの OSS に無料。通常の Starter は 1 人 50 クレジット / 月まで無料 | ベンダー持ち | Pro は 1 クレジット 1 ドル（Base 1、Plus 3、Apex 10 クレジット / レビュー） |
| Copilot code review | Actions 分は public 無料、AI クレジットは消費 | 自分持ち | 前述 |
| [Claude Code GitHub Action](https://github.com/anthropics/claude-code-action) | Actions の実行は public 無料。モデル利用料は Anthropic API / Bedrock / Vertex AI / Microsoft Foundry に自分で支払う。OSS 向け無料クレジットはない | 自分持ち | API 従量 |

## ホスティング・配信・監視

| サービス | OSS 向けの内容 | 条件 |
|---|---|---|
| [Netlify Open Source](https://www.netlify.com/open-source/) | 月 10,000 クレジット、Deploy Preview、メンバー無制限。クレジットが尽きてもサイトは落ちない | OSI または CC ライセンス、Code of Conduct、Netlify へのリンクバック、非商用 |
| [Vercel Open Source Program](https://vercel.com/open-source-program) | 3 年で 3,600 ドル分のクレジット | 2026 年 10 月時点で申請受付停止中 |
| [Cloudflare Project Alexandria](https://www.cloudflare.com/lp/project-alexandria/) | 年間クレジット。Pro / Business / Enterprise へのアップグレード、Workers / Pages の上限引き上げ、R2 追加に使える | 認められた OSS ライセンス、非営利運営。小規模なら通常の無料枠で足りると Cloudflare 自身が明記 |
| [Docker-Sponsored Open Source](https://www.docker.com/community/open-source/application/) | pull rate limit の撤廃、Verified バッジ、コアコントリビューターに Docker Team 1 年分 | OSI 定義を満たす、直近 6 か月に更新あり、収益化への経路がないこと（寄付は可）、1 年ごとに更新 |
| [Read the Docs Community](https://about.readthedocs.com/pricing/) | ドキュメントホスティングが永続無料 | 広告付き、OSS であること |
| [Sentry](https://sentry.io/for/open-source/) | エラー 500 万、ログ 5,000 GB、スパン 10 億、リプレイ 10 万、cron 500、アップタイム 25、Seer AI 5 人分。Business 機能、期限なし | Apache や MIT のような「friendly license」、申請 |

## 条件の読み方

| 要求の厳しさ | 内容 | 該当 |
|---|---|---|
| public であることのみ | 公開されていればよく、商用予定でも使える | GitHub Actions、Packages、CodeQL、Codecov、CodeRabbit、SonarQube Cloud（OSI ライセンスは必要） |
| 非商用かつ OSI ライセンス | 収益化した時点で条件を外れる | Greptile、Netlify、Cloudflare、Cypress、JetBrains |
| 収益化の経路がないこと | 寄付は可、有料プランやサービスは不可 | Docker |
| 本人の実績で判定 | プロジェクトではなく人を見る | Copilot Pro、Claude for Open Source、JetBrains |

将来マネタイズするかもしれないプロジェクトは、1 行目のものだけを当てにしておくのが安全である。

## 自分の環境でやること

1. リポジトリを public にし、OSI ライセンスを置く
2. Copilot 設定画面で Pro 無料の対象かを確認する
3. Claude for Open Source の条件のうち、他人のリポジトリへのマージ済み PR 100 本、または自分のリポジトリの外部コントリビューター 20 人に届いているか数える
4. macOS ビルドが重ければ CircleCI の OSS プランを申請する

## 未確認

- 1Password for Open Source は公式ページを取得できなかった
- Depot の OSS 割引は問い合わせベースで公開情報がない
- Copilot Pro 無料の「人気」の基準は非公開
