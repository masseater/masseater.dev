---
title: "typescript-template の内容（2026年10月24日時点）"
description: "Cloudflare上で動作するTypeScriptアプリ向けGitHubテンプレート「typescript-template v0.0.10」の構造と仕組み。"
tags: ["TypeScript", "Cloudflare", "Claude Code"]
published: true
---

GitHubテンプレート [typescript-template](https://github.com/masseater/typescript-template) を公開している。これは、チェック、CI、デプロイ、およびAIエージェントとの連携ルールがすでに整備された状態から、Cloudflare上で動作するTypeScript製Webアプリを立ち上げるためのものである。新しいリポジトリを作成するたびに、リントやCI、デプロイを再構築する手間を省くためにこれを作った。[テンプレートそのままのアプリ](https://typescript-template-web-production-ntesuocc46gilfjl.masseater.workers.dev)も動作している。

このテンプレートは、コードを書くのは主にAIエージェントであるという前提で構築されている。何を使うか、何を禁止するか、何をチェックするかは、人が決めることだ。何が入っているのか、各パーツがどのように動作するのかを順に紹介する。内容は2026年10月24日時点のv0.0.10のものである。

## アプリの構造

| 役割                                 | 何に使うか                   |
| ------------------------------------ | ---------------------------- |
| 画面                                 | TanStack Start               |
| API                                  | Elysia                       |
| データベース                         | Cloudflare D1, Drizzleで処理 |
| 認証                                 | better-auth                  |
| UI                                   | shadcn/ui                    |
| UI状態                               | effect-atom                  |
| サーバーの状態                       | TanStack Query               |
| バリデーション、日付、ログ、トレース | Effect                       |

APIはElysiaで書かれている。`src/app/routes/api.$.ts` は `/api/*` を Elysia ルーターに渡し、各スライスがそこに独自のルートを追加する。クライアント側では、TanStack QueryのクエリはElysiaのクライアントであるEdenの型から構築されるため、API型を手作業でコピーする箇所はない。SSR 中、`createIsomorphicFn` はルートの `handle` を直接呼び出すため、アプリは自身への HTTP ラウンドトリップを行わない[^structure]。

```ts
const client = createIsomorphicFn()
  .server(() => serverClient<TodoRoutes>(loadTodoRoutes))
  .client(() => browserClient<TodoRoutes>());

const todoQueries = createQueries<TodoRoutes>(client());
```

`serverClient` は独自の `fetcher` を Eden の `treaty` に渡し、受け取った `Request` を Elysia アプリの `handle` に直接渡す。`browserClient` は、自身のオリジンにおいて同一の `treaty` を指す。どちらも `TodoRoutes` から型を取っているため、ルート定義が変更された際にクエリの引数と戻り値がそれに追従する。

D1スキーマは`*.table.ts`で記述されており、マイグレーションは`vp run db:generate`で生成される。better-authのテーブルも`vp run auth:generate`で生成され、手動で記述されるものではない。UI状態とサーバー状態は別々のライブラリに分かれているため、どちらが値を保持しているかについて曖昧さがない。検証、日付、ログ、トレースはEffectに集約されており、用途ごとに個別のライブラリが追加されることはない。アプリの内部はFeature-Sliced Designで切り出されており、コードは使用される箇所の近くに配置され、再利用されるまで切り出されない。

## インフラストラクチャ

Cloudflareのリソースは[Alchemy](https://alchemy.run)を用いたコードとして定義されており、wranglerは使用されていない。`alchemy.run.ts` で D1 と Worker を定義し、`vp exec alchemy deploy --stage production` でデプロイする。すべてのリソース名は `src/app/app-name.ts` の `APP_NAME` から構築されており、テストの結果、他の名前が混在していないことが確認されている[^alchemy]。

本番用のWorkerには、最初から保護と記録機能が備わっている。カスタムドメインのゾーンを持つリポジトリでは、脆弱性スキャナーが調査する典型的なパスのリストからWAFカスタムルールが生成される。生成された式は次のようになっている。

```text
(lower(http.request.uri.path) contains "/wp-admin" or ...) and not <ハニーポットのパス>
```

ハニーポットとして残されたパスはブロックされず、専用のWorkerが受け取る。このWorkerは、Analytics Engineにパス、送信元IP、国、ASN、User-Agentを含む1行のみを書き込み、404を返すため、後でどこから何をプローブしたかを集計できる。すべての Worker は `logpush: true` であるため、ログは外部に保持される[^edge-guard]。Workers Paidプランを前提としている。

## チェック

すべてのチェックは、`vp run verify` という1つのコマンドで実行される。verify は `vite.config.ts` 内のタスクで、まず `dependsOn` に記載されたチェックを実行し、最後に `vp check` を実行する。

```ts
verify: {
  command: "vp check",
  dependsOn: ["test-all", "eslint", "syncpack", "markdown-lint", "renovate",
              "actions-lint", "steiger-all", "db-check-all", "fallow-all", "audit"],
},
```

ここに入れるのは、型チェックとリント、テスト、依存関係のバージョン照合、Markdownの文章チェック、Renovate設定のバリデーションだ[^verify]。続いて、GitHub Actionsのワークフロー自体のチェック、Feature-Sliced Designの構造的チェック、およびDrizzleスキーマがマイグレーションと一致しているかを確認する。デッドコードや未使用の依存関係の検出、脆弱な依存関係の監査もここにある。`vp run` は入力ファイルや環境変数に基づいてキャッシュを行うため、変更のないチェックは再度実行されない。Markdownの文章チェックには、日本語の技術文書に関するルールや、AIが記述したテキストで頻出する表現を検出するルールが含まれている。

リントポリシーは以下の通りである。

| ポリシー                                                       | 仕組み                                                                                                                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 使用しているライブラリの公式ルールをすべてエラーとして出力せよ | oxlintのJSプラグイン機構でESLintプラグインを読み込み、各プラグインの`rules`を列挙して、すべて`error`にする。                                                   |
| 採用されなかったライブラリの持ち込み禁止                       | 「理由 → 禁止するパッケージ名」のテーブルから `no-restricted-imports` 設定を生成する。1つインポートするとその場で違反となり、その理由が表示される[^restricted] |
| ASTからは判定できないルールをLLMに判定させる                   | 自作の [oxlint-plugin-decision](https://www.npmjs.com/package/@r_masseater/oxlint-plugin-decision) では、LLMにファイルごとの判定を依頼している[^decision]      |

1つ目は、プラグインの `rules` オブジェクトのキーを単に列挙する関数で実装されている。

```ts
const allRulesOf = (prefix: string, plugin: Readonly<{ rules: object }>): Rules =>
  asErrors(Object.keys(plugin.rules).map((rule) => `${prefix}/${rule}`));

rules: {
  ...allRulesOf("tanstack-query", tanstackQuery),
  ...allRulesOf("tanstack-router", tanstackRouter),
  ...allRulesOf("shadcn", shadcn),
},
```

推奨リストをコピーするのではなく、プラグインが持つすべてのルールを有効にするため、プラグインのアップデートで追加されたルールが自動的に適用される。oxlint自身のカテゴリはnurseryまで一貫して `error` に設定されており、`denyWarnings` は警告を1つも残さない。

2つ目の表は、例えばこんな感じだ。

```ts
const requiredStack = {
  "検証、日時、ログ、関数型ユーティリティは Effect だけで扱う": ["zod", "dayjs", "lodash", "fp-ts", ...],
  "UI 状態は effect-atom だけで扱う": ["zustand", "jotai", "redux", ...],
};
```

この表から、`paths` と `patterns` が構築され、ESLint の `no-restricted-imports` に渡される。エージェントが zod をインポートすると、「Effect だけで扱う」という理由が lint メッセージとして返ってくる。これは CLAUDE.md に「zod は使わない」と書くよりも確実に止める。

3つ目のLLM判定は、oxlintのJSプラグインとして動作する。ルールは、英語によるはい/いいえ形式の質問、違反時のメッセージ、および信頼度の閾値によって定義される。

```ts
defineDecisionRule({
  id: "exclusive-status",
  target: "file",
  question:
    "Does this code represent one piece of state with several boolean flags ... instead of one exclusive status expressed as a discriminated union? ...",
  message: "状態は排他的なstatusを持つ判別共用体で表し、booleanフラグの組を使わない。",
  cutoff: 0.8,
});
```

質問はOpenRouterを通じてファイルごとにモデルへ送信され、信頼度が閾値を超えた場合にのみ違反となる。判定結果はファイル内容をキーとしてキャッシュされ、CIでも `actions/cache` で引き継がれるため、変更のないファイルに対しては同じ質問が再送されることはない。LLMがリントを引き受けると、その判断が揺らぐのではないかという懸念がある。そこで、確信が持てるものだけを違反とし、見落としを検知するために閾値を下げないことに決めた。何かをルールとする前に、答えが分かっている違反例と違反していない例で判定できるかを確認する。

コード内のコメントは `eslint-plugin-no-comments` で禁止されており、許可されるのはリント無効化ディレクティブのみである。そうした無効化ディレクティブであっても、不要になれば `reportUnusedDisableDirectives` によってエラーになる。「なぜ」はコミットメッセージに記載する[^docs]。コードを読んでわかることは書かないという方針の延長で、説明が陳腐化する箇所を減らしている。

## CIとデプロイ

PRごとにCIはない。mainがプッシュされるとverifyワークフローが実行され、パスすればそのまま本番にデプロイされる。本番環境で挙動がチェックされるという順番だ[^workflow]。

verifyジョブは、pushされた範囲のコミットメッセージをcommitlintでチェックし、gitleaksでリークされたシークレットを探し、その後`vp run verify`を実行する。デプロイジョブは検証の成功を待ち、その時点で自身のコミットが依然として main のヘッドである場合にのみ `alchemy deploy` を実行する。これにより、プッシュが連続する場合に、古いコミットが後からデプロイされるのを防ぐことができる。

```yaml
- id: head
  run: |
    current="$(gh api "repos/$GITHUB_REPOSITORY/commits/$REF_NAME" --jq .sha)"
    if [ "$current" = "$HEAD_SHA" ]; then
      echo "latest=true" >> "$GITHUB_OUTPUT"
    fi
- if: steps.head.outputs.latest == 'true'
  run: vp exec alchemy deploy --stage production --yes
```

GitHubの並行処理設定で古い実行をキャンセルするやり方もあるが、通ったコミットはキャンセルせずに検証として残しておきたいので、デプロイ直前にそのコミットがheadかどうかを確認する。

本番環境もデプロイ後に計測する。

| 測定                    | タイミング           | 仕組み                                                                                                                                                                                                                  |
| ----------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse Web Vitals   | デプロイ直後         | `tools/web-vitals` は、ユーザーフローにおける同一オリジンリンクのクリックによってトリガーされるプロダクションURLとナビゲーションを測定する。LCP、INP、またはCLSのいずれかが合格点に達していない場合、ジョブは失敗する。 |
| ZAPベースラインスキャン | 週に1回              | `zaproxy/action-baseline` を本番環境で実行する。警告を含めすべて修正され、`rules.tsv`には誤検知のみが書き込まれる。                                                                                                     |
| 各CIジョブに要した時間  | 各ワークフローごとに | 最後のジョブは、ジョブの時刻と手順を自分のWorkerに送信する。WorkerはGitHubのOIDCトークンで送信元を確認し、Workers Logsに記録する。                                                                                      |

検証に失敗すると、autofixジョブが起動してautofixワークフローを呼び出し、失敗した実行のID、ブランチ、およびコミットを渡す。autofixは、コミットが引き続きブランチのheadであることを確認する。失敗が main にある場合は、修正用のブランチを切り、[claude-code-action](https://github.com/anthropics/claude-code-action) で Claude を実行する。プロンプトでは、`gh run view --log-failed` で失敗ログを読み込み、リントを弱めずに根本原因を修正して `vp run verify` がパスするまでこれを繰り返し、コミットするように指示されている。コミットが行われた場合はプッシュし、fixブランチの場合はドラフトPRを開く。依存関係の更新はRenovateが自動マージし、リリースはrelease-pleaseがカットする[^automation]。日常的に手作業で行わなければならない作業がなくなる。

## AIエージェントを扱う際のルール

CLAUDE.md の最上位の原則は、何かを強制したり推奨したりしたい場合の手段をどう選ぶかである[^principle]。

1. ライブラリの公式な統合手段（リントルール、スキル、プラグイン、CLIなど）
2. それを実現する既存のライブラリやツール
3. 方針を提示するブログ、イシュー、ディスカッション
4. 自作する

自作は最後だ。また、チェックを通過させるための設定の無効化や簡略化、閾値の引き下げ、抑制ディレクティブの使用も禁止している。エージェントに任せると真っ先に起こるのが「リントをオフにして通らせる」ことだからだ。

これらのルールはテキストで記述されているだけでなく、Claude Codeのフック[^hooks]によって機械的に強制されている。フックは `.claude/settings.json` に登録された小さなスクリプトで、すべて Effect で記述されている。

| タイミング           | 何が動作するか                                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| セッション開始時に   | 依存関係をインストールする。テンプレートの新リリースがあった際に通知する                                                                                                                                   |
| Bashを実行する直前   | コマンドをシェル構文として解析し、pnpm を直接実行すると、`env` や `bash -c` の深いところまで入っていても拒否し、`vp` での書き方を返す。                                                                    |
| ファイルを編集した後 | 編集中のワークスペースで `--changed-since HEAD` を指定してfallowを実行し、デッドコードや未使用の依存関係が現れた場合は戻す。                                                                               |
| 作業の終わりに       | `vp run verify` を実行し、失敗した場合は終了を停止する。エージェントはログを読み込み、作業を続ける。                                                                                                       |
| 作業の終わりに       | 4人のレビュアーエージェントが `git diff` を読み取る。それぞれが重視しているのは、チェックの緩和、自前で構築する根拠、フィーチャースライシング設計によるコロケーション、そしてウェブ標準の活用という1点だ。 |

終了を阻止するフックは、検証結果のみを参照し、Claude Codeが標準出力として解釈するJSONを書き出す。

```ts
runHook(
  Effect.gen(function* stopGate() {
    const verify = yield* runCommand(yield* localBin("vp"), ["run", "--log", "grouped", "verify"]);
    if (!verify.succeeded) {
      yield* writeJson(StopOutput, {
        decision: "block",
        reason: `vp run verify が失敗している。\n${verify.output.slice(-REPORTED_OUTPUT_LENGTH)}`,
      });
    }
  }),
);
```

`decision` が `block` の場合、Claude Code は応答を完了できず、`reason` がそのままエージェントの次の入力となる。失敗ログの末尾が渡されるため、エージェントは何が壊れたかを読み取って、そのまま修正に移る。

レビュアーエージェントは、プロンプトと判定材料（`git status`、`git diff HEAD`、`git log main..HEAD -p`）が与えられた際の `agent` 型の Claude Code フックである。問題がある場合は、`ok: false` とその修正方法を返し、それがエージェント自体に返される。

`/loop`[^loop] という自己改善ループもある。その内容は3行の手順書である。使用しているライブラリやツールについては、最上位の原則に従って、まだ適用されていないより厳格なチェック手段を探すこと。見つけたら、意図的な違反で失敗し、それが元に戻ればパスすることを確認した上で、追加する。セッションの開始時に引数なしで起動する決まりであり、これによりテンプレートが配布された時点で終了せず、使用するたびにより厳格になる。

## テンプレートの更新を取り込む

テンプレートから作成されたリポジトリは、元のテンプレートが更新されても放置されがちだ。ここでは、release-pleaseがテンプレートのバージョンをカットし、派生リポジトリ側のセッション開始フックが差分を取り込む手順を提示している[^release]。

フックは `.github/release-please/manifest.json` から取得したバージョンを読み込み、GitHub API経由でテンプレートの最新リリースを取得する。差異がある場合は、Claude Code の `additionalContext` としてエージェントに指示を返し、最初のレスポンスで新リリースがあったことと変更点を報告するよう伝える。それを受け取りたいと回答した場合の手順もそこに書かれている。

```sh
git fetch --no-tags https://github.com/masseater/typescript-template.git \
  refs/tags/v0.0.9:refs/template/v0.0.9 refs/tags/v0.0.10:refs/template/v0.0.10
git diff refs/template/v0.0.9 refs/template/v0.0.10 | git apply --3way
```

2つのタグの差分のみを3ウェイマージで適用するため、派生リポジトリ側の変更と衝突する箇所のみがコンフリクトとして残る。エージェントは競合の解消、`vp install` と `vp run verify` の通過、コミットへと進む。

## 関連

公開リポジトリで開発することの意義については[別の記事](/blogs/public-repo-development)で、公開すると無料になるものについては[OSSの無料プランまとめ](/blogs/oss-free-plans)で書いた。至る所でEffectを採用する理由は、[AIにコードを書かせるなら、あらゆる場面でEffectを採用せよ](/blogs/effect-for-ai)にある。

[^structure]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「構成」「配置」「その他」と [apps/web/src/shared/api](https://github.com/masseater/typescript-template/tree/main/apps/web/src/shared/api)

[^alchemy]: [apps/web/alchemy.run.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/alchemy.run.ts)、[apps/web/app-name.test.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/app-name.test.ts)

[^edge-guard]: [apps/web/edge-guard.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/edge-guard.ts)、[apps/web/honeypot.worker.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/honeypot.worker.ts)

[^verify]: [vite.config.ts](https://github.com/masseater/typescript-template/blob/main/vite.config.ts)

[^restricted]: [lint.config.ts](https://github.com/masseater/typescript-template/blob/main/lint.config.ts)

[^decision]: [decision-rules.ts](https://github.com/masseater/typescript-template/blob/main/decision-rules.ts)

[^docs]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「文書」

[^workflow]: [.github/workflows/verify.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/verify.yml)

[^automation]: [autofix.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/autofix.yml)、[zap.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/zap.yml)、[ci-telemetry.sh](https://github.com/masseater/typescript-template/blob/main/.github/scripts/ci-telemetry.sh)、[renovate.json](https://github.com/masseater/typescript-template/blob/main/renovate.json)

[^principle]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「最上位原則」

[^hooks]: [.claude/settings.json](https://github.com/masseater/typescript-template/blob/main/.claude/settings.json)、[.claude/hooks](https://github.com/masseater/typescript-template/tree/main/.claude/hooks)

[^loop]: [.claude/loop.md](https://github.com/masseater/typescript-template/blob/main/.claude/loop.md)

[^release]: [.claude/hooks/template-release.ts](https://github.com/masseater/typescript-template/blob/main/.claude/hooks/template-release.ts)
