---
title: "typescript-template の中身（2026年10月24日時点）: Cloudflare で動く TypeScript アプリを検査と CI がそろった状態から始める"
description: "Cloudflare で動く TypeScript の Web アプリを、検査・CI・デプロイ・AI エージェントとの作業の決まりがそろった状態から始めるための GitHub テンプレート。2026年10月24日時点の v0.0.10 について、何が入っていて、それぞれどう動いているかをコードの抜粋とともに紹介する。"
tags: ["TypeScript", "Cloudflare", "Claude Code"]
published: true
---

GitHub テンプレート [typescript-template](https://github.com/masseater/typescript-template) を公開している。Cloudflare で動く TypeScript の Web アプリを、検査・CI・デプロイ・AI エージェントとの作業の決まりがそろった状態から始めるためのものである。新しいリポジトリを作るたびに lint や CI やデプロイを組み直す手間をなくすために作った。[テンプレートのままのアプリ](https://typescript-template-web-production-ntesuocc46gilfjl.masseater.workers.dev)も動いている。

このテンプレートは、コードを書くのは主に AI エージェントだという前提で組んでいる。人間が決めるのは、何を使い、何を禁止し、何を検査するかである。何が入っていて、それぞれどう動いているかを順に紹介する。内容は 2026年10月24日時点の v0.0.10 のものである。

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

API は Elysia で書く。`src/app/routes/api.$.ts` が `/api/*` を Elysia のルーターへ渡し、各スライスは自分のルートをそこへ足す。クライアント側は Elysia のクライアントである Eden の型から TanStack Query のクエリを作るので、API の型を書き写す場所がない。SSR 中は `createIsomorphicFn` でルートの `handle` を直接呼び、自分自身へ HTTP を往復させない[^structure]。

```ts
const client = createIsomorphicFn()
  .server(() => serverClient<TodoRoutes>(loadTodoRoutes))
  .client(() => browserClient<TodoRoutes>());

const todoQueries = createQueries<TodoRoutes>(client());
```

`serverClient` は Eden の `treaty` に独自の `fetcher` を渡し、受け取った `Request` を Elysia アプリの `handle` にそのまま渡す。`browserClient` は同じ `treaty` を自分のオリジンに向ける。どちらも型は `TodoRoutes` から取るので、クエリの引数と戻り値はルート定義を変えれば追従する。

D1 のスキーマは `*.table.ts` に書き、`vp run db:generate` でマイグレーションを生成する。better-auth のテーブルも `vp run auth:generate` で生成し、手で書かない。UI 状態とサーバー状態は別のライブラリに分け、どちらが持つ値かを曖昧にしない。検証、日時、ログ、トレーシングは Effect に寄せ、用途ごとに別のライブラリを足さない。アプリの中は Feature-Sliced Design で切り、使われる場所の近くに置いて、再利用されるまで切り出さない。

## インフラ

Cloudflare のリソースは [Alchemy](https://alchemy.run) でコードとして定義し、wrangler は使わない。`alchemy.run.ts` が D1 と Worker を定義し、`vp exec alchemy deploy --stage production` でデプロイする。リソース名はすべて `app-name.ts` の `APP_NAME` から組み立て、別の名前が混ざらないことをテストで確かめている[^alchemy]。

本番の Worker には最初から守りと記録が付いている。独自ドメインのゾーンを持つリポジトリでは、脆弱性スキャナが探る典型的なパスの一覧から WAF のカスタムルールを生成する。生成されるのは次のような式である。

```text
(lower(http.request.uri.path) contains "/wp-admin" or ...) and not <ハニーポットのパス>
```

ハニーポットに残したパスは遮断せず、専用の Worker が受ける。この Worker はパス、接続元 IP、国、ASN、User-Agent を Analytics Engine に 1 行書いて 404 を返すだけで、どこから何を探られたかが後から集計できる。すべての Worker に `logpush: true` を付け、ログを外に残す[^edge-guard]。Workers Paid プランが前提である。

## 検査

検査は `vp run verify` の 1 コマンドで全部走る。verify は `vite.config.ts` のタスクで、`dependsOn` に並べた検査を先に動かし、最後に `vp check` を実行する。

```ts
verify: {
  command: "vp check",
  dependsOn: ["test-all", "eslint", "syncpack", "markdown-lint", "renovate",
              "actions-lint", "steiger-all", "db-check-all", "fallow-all", "audit"],
},
```

ここに入るのは、型検査と lint、テスト、依存のバージョン一致、Markdown の文章検査、Renovate 設定の検証である[^verify]。さらに GitHub Actions のワークフロー自体の検査、Feature-Sliced Design の構造検査、Drizzle のスキーマとマイグレーションの一致が続く。dead code と未使用依存の検出、脆弱性のある依存の監査もここにある。`vp run` は入力ファイルと環境変数からキャッシュするので、変更のない検査は再実行されない。Markdown の文章検査には、日本語の技術文書向けのルールと、AI が書いた文章にありがちな表現を検出するルールが入っている。

lint の方針は次の表のとおりである。

| 方針                                              | 仕組み                                                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 使うライブラリの公式ルールをすべて error で入れる | oxlint の JS プラグイン機構で ESLint 用プラグインを読み込み、各プラグインの `rules` を列挙して全部 `error` にする                                        |
| 採用しなかったライブラリの import を禁止する      | 「理由 → 代わりに禁止するパッケージ名」の対応表から `no-restricted-imports` の設定を生成する。import した時点で違反になり、理由が表示される[^restricted] |
| AST で判定できない決まりは LLM に判定させる       | 自作の [oxlint-plugin-decision](https://www.npmjs.com/package/@r_masseater/oxlint-plugin-decision) が、ファイル単位で LLM に判定を求める[^decision]      |

1 つ目は、プラグインの `rules` オブジェクトのキーを列挙するだけの関数で実現している。

```ts
const allRulesOf = (prefix: string, plugin: Readonly<{ rules: object }>): Rules =>
  asErrors(Object.keys(plugin.rules).map((rule) => `${prefix}/${rule}`));

rules: {
  ...allRulesOf("tanstack-query", tanstackQuery),
  ...allRulesOf("tanstack-router", tanstackRouter),
  ...allRulesOf("shadcn", shadcn),
},
```

recommended の一覧を写すのではなく、プラグインが持つルールを全部有効にするので、プラグインの更新で足されたルールも自動で入る。oxlint 自体のカテゴリは nursery まで `error` にし、`denyWarnings` で warning を 1 件も残さない。

2 つ目の対応表は、たとえば次の形である。

```ts
const requiredStack = {
  "検証、日時、ログ、関数型ユーティリティは Effect だけで扱う": ["zod", "dayjs", "lodash", "fp-ts", ...],
  "UI 状態は effect-atom だけで扱う": ["zustand", "jotai", "redux", ...],
};
```

この表から `paths` と `patterns` を組み立てて ESLint の `no-restricted-imports` に渡す。エージェントが zod を import すると、「Effect だけで扱う」という理由が lint のメッセージとして返る。CLAUDE.md に「zod は使わない」と書くより確実に止まる。

3 つ目の LLM 判定は、oxlint の JS プラグインとして動く。ルールは英語の yes/no の問いと、違反時のメッセージ、確信度の閾値で定義する。

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

ファイルごとに問いを OpenRouter 経由のモデルに投げ、閾値を超えた確信度のときだけ違反にする。判定結果はファイル内容をキーにキャッシュし、CI でも `actions/cache` で引き継ぐので、変更のないファイルに同じ問いを投げ直さない。LLM が lint を担うと、判定がぶれないかという不安がある。そこで、確信できるものだけを違反とし、閾値を下げて取りこぼしを拾いにいかないと決めている。ルール化の前に、正解の分かる違反例と非違反例で判定できるかを確かめる。

コード内コメントは `eslint-plugin-no-comments` で禁止し、許すのは lint の disable 指示だけである。その disable 指示も、不要になったものは `reportUnusedDisableDirectives` で error になる。「なぜ」はコミットメッセージに書く[^docs]。コードを読めば分かることを書かない、という方針の延長で、説明が古くなる場所を減らしている。

## CI とデプロイ

PR ごとの CI はない。main に push されると verify ワークフローが走り、通ればそのまま本番にデプロイされる。動作は本番で確かめる、という順序である[^workflow]。

verify ジョブは、push された範囲のコミットメッセージを commitlint で確かめ、gitleaks で秘密情報の混入を見てから、`vp run verify` を動かす。deploy ジョブは verify の成功を待ち、その時点でも自分のコミットが main の先頭であるときだけ `alchemy deploy` を実行する。連続で push されたときに古いコミットが後からデプロイされるのを防ぐためである。

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

GitHub の concurrency 設定で古い run を取り消す方法もあるが、verify が通ったコミットを取り消さずに残しておきたいので、デプロイの直前に先頭かどうかを見る形にしている。

デプロイしたあとの本番も計測する。

| 計測                       | いつ             | 仕組み                                                                                                                                              |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse の Web Vitals   | デプロイ直後     | `tools/web-vitals` が本番 URL と、同じオリジンのリンクを押した遷移を user flow で測る。LCP・INP・CLS のどれかが合格点に届かなければジョブが失敗する |
| ZAP のベースラインスキャン | 週に 1 回        | `zaproxy/action-baseline` を本番に当てる。警告も含めて直し、誤検知だけを `rules.tsv` に書く                                                         |
| CI のジョブごとの所要時間  | ワークフローごと | 最後のジョブがジョブとステップの時間を自前の Worker に送る。Worker は GitHub の OIDC トークンで送り元を確かめ、Workers Logs に残す                  |

verify が失敗すると autofix ジョブが起動し、失敗した run の ID とブランチとコミットを渡して autofix ワークフローを呼ぶ。autofix はそのコミットがまだブランチの先頭であることを確かめる。main での失敗なら修正用のブランチを切り、[claude-code-action](https://github.com/anthropics/claude-code-action) で Claude を動かす。プロンプトは、失敗ログを `gh run view --log-failed` で読んで lint を弱めずに根本原因を直し、`vp run verify` が通るまで繰り返してコミットするよう指示する。コミットができていれば push し、修正用ブランチなら draft の PR を開く。依存の更新は Renovate が automerge し、リリースは release-please が切る[^automation]。人間が定期的に手を動かす箇所をなくしている。

## AI エージェントとの作業の決まり

CLAUDE.md の最上位原則は、何かを強制・推奨したいときの手段の選び方である[^principle]。

1. ライブラリ公式の統合手段（lint ルール、skill、plugin、CLI など）
2. それを実現している既存のライブラリやツール
3. 方針を提言しているブログ・issue・discussion
4. 自作

自作は最後である。あわせて、検査を通すための設定の無効化や簡易化、閾値の引き下げ、抑止ディレクティブの使用を禁じている。エージェントに任せると最初に起きるのが「lint を off にして通す」だからである。

この決まりは文章で書くだけでなく、Claude Code のフックで機械的に守らせる[^hooks]。フックは `.claude/settings.json` に登録した小さなスクリプトで、すべて Effect で書いてある。

| タイミング          | 動くもの                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| セッション開始時    | 依存をインストールする。テンプレートの新しいリリースがあれば知らせる                                                                                  |
| Bash を実行する直前 | コマンドをシェル構文として解析し、`env` や `bash -c` の奥にあっても pnpm の直接実行なら拒否して、`vp` での書き方を返す                                |
| ファイル編集後      | 編集したワークスペースに対して fallow を `--changed-since HEAD` で走らせ、dead code や未使用依存が出れば差し戻す                                      |
| 作業終了時          | `vp run verify` を走らせ、失敗したら終了を止める。エージェントはログを見て作業を続ける                                                                |
| 作業終了時          | 4 つの審査エージェントが `git diff` を読む。検査の緩和、自作の正当性、Feature-Sliced Design のコロケーション、Web 標準の使い方をそれぞれ 1 つずつ見る |

終了を止めるフックは、verify の結果を見て Claude Code が解釈する JSON を標準出力に書くだけである。

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

`decision` が `block` だと Claude Code は応答を終えられず、`reason` がそのままエージェントへの次の入力になる。失敗ログの末尾を渡しているので、エージェントは何が壊れたかを読んでそのまま直しに向かう。

審査エージェントは Claude Code のフックの `agent` 型で、プロンプトと判定材料（`git status`、`git diff HEAD`、`git log main..HEAD -p`）を渡す。問題があれば `ok: false` と直し方を返し、それがエージェント本人に差し戻される。

さらに `/loop` という自己改善ループがある[^loop]。中身は 3 行の手順である。使っているライブラリとツールについて、まだ適用していないより厳しい検査手段を最上位原則の順で探す。見つけたら、意図的な違反で失敗し、戻すと通ることを確かめてから足す。セッションの最初に引数なしで起動する決まりなので、テンプレートは配った時点で止まらず、使うたびに厳しくなる。

## テンプレートの更新を取り込む

テンプレートから作ったリポジトリは、元のテンプレートが更新されても放置されがちである。ここでは release-please でテンプレートにバージョンを切り、派生リポジトリ側のセッション開始フックが差分を取り込む手順を出す[^release]。

フックは `.github/release-please/manifest.json` から自分が取り込んでいるバージョンを読み、GitHub API でテンプレートの最新リリースを取る。差があれば、新しいリリースがあることと変更点を最初の応答で知らせるよう、エージェントへの指示を Claude Code の `additionalContext` として返す。取り込むと答えたときの手順もそこに書いてある。

```sh
git fetch --no-tags https://github.com/masseater/typescript-template.git \
  refs/tags/v0.0.9:refs/template/v0.0.9 refs/tags/v0.0.10:refs/template/v0.0.10
git diff refs/template/v0.0.9 refs/template/v0.0.10 | git apply --3way
```

2 つのタグの差分だけを 3-way で当てるので、派生リポジトリ側の変更とぶつかった箇所だけが衝突として残る。衝突を解消し、`vp install` と `vp run verify` を通してコミットするところまでエージェントが進める。

## 関連

public リポジトリで開発する意義は[別の記事](/blogs/public-repo-development)に、public にすると無料になるものは[OSS 向け無償プランのまとめ](/blogs/oss-free-plans)に書いた。Effect を全面採用する理由は[AIにコードを書かせるならEffectを全面採用する](/blogs/effect-for-ai)にある。

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
