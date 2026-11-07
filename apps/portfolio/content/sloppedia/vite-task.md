---
title: "Vite Task"
description: "VoidZero が Rust で書いた、モノレポに対応したタスクランナー。タスクが実際に読んだファイルや環境変数を記録してキャッシュする。Vite+ の vp run の中身である。"
tags: ["タスクランナー", "モノレポ", "Rust", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "VoidZero"
  - label: "組み込み先"
    value: "Vite+（vp run）"
  - label: "言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "github.com/voidzero-dev/vite-task"
    href: "https://github.com/voidzero-dev/vite-task"
---

Vite Task は、モノレポのパッケージの依存の順にタスクを動かし、結果をキャッシュするタスクランナーである[^vite-plus-1]。[VoidZero](/sloppedia/voidzero) が作り、[Vite+](/sloppedia/vite-plus) の `vp run` として使われている[^vite-plus-1]。

`package.json` のスクリプトと、`vite.config.ts` に書いたタスクの両方を動かせる[^run]。使い勝手は `pnpm run` に似ている[^run]。

## キャッシュ

Vite Task は、タスクが実際に読んだファイルと引数と環境変数を記録する[^vite-plus-1]。次の実行でどれも変わっていなければ、タスクを動かさずに前回の出力を再生する[^run]。

ベータからは、Vite が報告する情報も合わせて使うようになった[^beta]。ビルドの入力や出力や環境変数を書き並べなくても、ビルドを正しくキャッシュできる[^beta]。

`vite.config.ts` に書いたタスクは既定でキャッシュされる[^run]。`package.json` のスクリプトは、`--cache` を付けたときだけキャッシュされる[^run]。

## 依存の順

タスクには `dependsOn` で先に動かすタスクを書ける[^run]。`@my/core#build` のように、別のパッケージのタスクも指せる[^run]。

| オプション | 動かす範囲                                     |
| ---------- | ---------------------------------------------- |
| なし       | 今いるディレクトリのパッケージ                 |
| `-r`       | すべてのパッケージを依存の順に                 |
| `-t`       | 指定したパッケージと、それが依存するパッケージ |
| `--filter` | 名前やディレクトリや glob で選んだパッケージ   |
| `-w`       | ワークスペースのルート                         |

表は Vite+ の公式の文書に基づく[^run]。パッケージの依存の順は、各パッケージの `package.json` に書いた普通の依存から決める[^run]。タスクランナーのためだけの別のグラフは持たない[^run]。

## シェルの扱い

単純なコマンドと `&&` でつないだコマンドは、シェルに渡さず Vite Task が自分で解釈する[^run]。そのため、どの OS でも同じように動く[^run]。`&&` でつないだコマンドは別々のタスクに分けて、それぞれキャッシュする[^run]。

## 2026年の動き

8月には、Codex CLI や Claude Code の sandbox の中でも `vp run` が動くようになった[^recap-aug]。ベータの告知は、1.0 までの課題の1つにリモートのキャッシュを挙げていた[^beta]。

[^vite-plus-1]: Alexander Lichter ほか「[Announcing Vite+ 1.0](https://voidzero.dev/posts/announcing-vite-plus-1-0)」VoidZero、2026年9月28日。

[^beta]: VoidZero「[Announcing Vite+ Beta](https://voidzero.dev/posts/announcing-vite-plus-beta)」2026年7月2日。

[^run]: Vite+「[Run](https://viteplus.dev/guide/run)」。2026年11月7日に閲覧。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。
