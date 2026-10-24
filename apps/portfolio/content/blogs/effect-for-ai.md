---
title: "AIにコードを書かせるならEffectを全面採用する"
description: "Effectは失敗と依存を型に載せ、effect-tsgoがその正しい使い方を型チェックで強制する。AIエージェントに書かせるなら、CLIや小さなスクリプトも例外にせず全面採用する。"
date: 2026-10-24
tags: ["Effect", "effect-tsgo", "TypeScript"]
published: true
---

## AIが書くコードに繰り返し出る欠陥

AIエージェントが書いたTypeScriptには、次のような欠陥が繰り返し出てくる。

- `fetch` に timeout がない
- `Promise.all` に数千件の配列をそのまま渡す
- `catch (e) {}` でエラーを握りつぶす
- AbortSignal を途中で渡し忘れる
- 手書きの retry が止まらない

どれも、関数が何で失敗するか、何に依存するか、リソースをいつ解放するかが型に現れないため、型チェックを通ってしまう。

## Effectは失敗と依存を型に載せる

Effect（effect-ts）の `Effect<A, E, R>` は次の三つを表す。

- `A`：成功時の値
- `E`：起こりうるエラー
- `R`：実行に必要な依存

2026年10月時点の既定はv4で、HTTP、SQL、CLI、AI、Schema、Config、Stream が同じコアの上にあり、依存は単一パッケージになった（[Effect v4 docs](https://effect.website/docs/v4/)）。

## Result型ライブラリとの違い

エラーを型に載せるだけなら、neverthrow や ts-results などのResult型ライブラリでもできる。違いは二つある。

### 遅延評価とruntime

Result型は実行済みの結果を表す。Effectは遅延評価されるプログラムの記述で、runtime が実行する。そのため実行の仕方をコンビネータとして合成できる。

| 欠陥 | Effectでの書き方 |
| --- | --- |
| timeout がない | `Effect.timeout` |
| 並列数が無制限 | `{ concurrency: 5 }` |
| retry が壊れている | `Effect.retry` に `Schedule` を渡す |
| 失敗時にリソースが残る | `Effect.acquireRelease` |
| キャンセルが伝わらない | Fiber への interrupt が自動で伝搬する |

冒頭の欠陥は、どれもこれらで書ける処理を手書きして壊したものだ。

### 依存を表す `R`

Result型には依存を表す場所がない。Effectでは、データベースやHTTPクライアントが必要な処理はそれが `R` に現れ、Layer を提供し忘れると型エラーになる。テストでは Layer を差し替える。

## AIにとっての利点

- 失敗と依存を、実装を読まずにシグネチャから知れる
- エラーの種類を追加すると、処理漏れの箇所が型エラーとしてすべて出る
- 型エラーはテストや実行時例外と違って決定的ですぐ返るので、修正ループが確実に回る

公式ドキュメントもこの点を強みに挙げている（[Effect v4 docs](https://effect.website/docs/v4/)）。

## 遅延評価の落とし穴

yield も代入もしていない Effect は実行されない。

```ts
const program = Effect.gen(function* () {
  saveUser(user) // yield* がないので保存は実行されない
  yield* sendWelcomeMail(user)
})
```

これは型エラーにならない。Promise の await 忘れと違い、処理自体が起きない。

## effect-tsgoが正しい使い方を強制する

### 正体

パッケージ名は `@effect/tsgo` で、Go製のTypeScriptコンパイラ TypeScript-Go に Effect Language Service を組み込んだビルドである（[Effect-TS/tsgo](https://github.com/Effect-TS/tsgo)）。tsgo の型チェックに加えて、次を提供する。

- 50種類以上の診断：floating Effect、処理されていないエラー型、満たされていない依存など
- refactor：async/await から Effect への変換、`Effect.gen` と `Effect.fn` の相互変換など

### lintとの違い

診断は通常のTypeScriptの診断として出力される（[Effect v4 Devtools](https://effect.website/docs/v4/getting-started/devtools)）。

- neverthrow の `eslint-plugin-neverthrow` は型チェックと別の工程なので、外すことも実行し忘れることもできる
- effect-tsgo は型チェックそのものなので、エディタでもCIでもエージェントの実行でも同じ診断が出る

ライブラリは使われなければ意味がないが、Effectは正しく使わせる手段を公式が提供している。

## 例外を作らない

CLIや小さなスクリプトだけResult型とlintにすると、次の問題が起きる。

- エラー処理の書き方が二つになり、エージェントはどちらで書くかを毎回判断して誤る
- 両者の境界で型が途切れ、そこは effect-tsgo の診断の外になる

全面採用は維持しやすい。

- Effectを返す関数を呼ぶ側はEffectで受けないと値を取り出せない
- `R` を満たすには Layer を書く必要がある
- 既存の async/await は effect-tsgo の refactor で移行できる

## コスト

- APIが大きく、v3からv4でも変わっている。LLMの学習データの大半はv3以前なので、存在しないAPIや古い書き方が出やすい
- Effectの型エラーは長く、コンテキストを消費する
- effect-tsgo はまだAlphaで、リリース間の破壊的変更が想定されている
- effect-tsgo には `typescript` 7以上のネイティブ版が必要で、素の tsgo と language server を併用すると診断が重複する（[Effect-TS/tsgo](https://github.com/Effect-TS/tsgo)）
