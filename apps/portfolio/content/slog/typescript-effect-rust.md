---
title: "TypeScript、Effect、Rust"
description: "TypeScriptですべてをEffectで記述し、計測が必要になった場合にのみ一部をRustに移行している。Effect Schemaは両言語共通の型定義であり、OpenTelemetryは両者を一つのトレースに統合している。"
tags: ["TypeScript", "Effect", "Rust", "OpenTelemetry"]
published: true
---

私のリポジトリでは、TypeScriptとRustの2つの言語を使っている。すべてはEffectで記述したTypeScriptから始まり、計測結果でTypeScriptでは遅すぎることが判明した場合や、ネイティブライブラリでしか対応できない場合にのみ、一部をRustに移行している。C#はUnity内でしか使用しておらず、Pythonは一切使っていない。2つの言語はすべての型の定義を共通化し、単一のトレースに集約しているため、両者の境界によるコストはほとんどかからない。

## ClaudeはデフォルトでEffectを用いてTypeScriptを記述する

コードの大部分はClaudeが書いており、特にEffectを用いたTypeScriptではミスが最も目立ちやすい。Effectは失敗や依存関係を型に組み込むが、effect-tsgoはEffectの誤用を型エラーに変換する。私は小規模なスクリプトも含め、あらゆる場面でEffectを採用しており、その理由については [AIにコードを書かせるならEffectを全面採用する](/slog/effect-for-ai) で記している。アプリ、Workers、CLI、そしてリントルールはすべてここから始まっている。

## Rustは、計測値やライブラリが求める場所で使う

あるパーツがRustに移行する理由は、2つある。1つ目は、私が計測した速度だ。私のリンターはRustでパースを行う。y8はモノレポ内の267個のMarkdownファイルを28 msでリントするが、rumdlは70 msかかる。しかし、それらのルールはTypeScriptのままであり、Rustエンジンが共有メモリを通じて渡す構文木の上を動く。ルールがRustに移行するのは、そのスパンがTypeScriptでは遅すぎることを示す場合に限られる。また、fu4についてはすべてのルールをRustからTypeScriptに移植し、エンジン側でのパースのみを維持するようにした。

2つ目の理由は、TypeScriptに良いライブラリがない作業だ。私の楽曲マネージャーでは、Hugging FaceのRust向け機械学習フレームワークであるcandle上のBS-RoFormerモデルを用いてトラックをステムに分割し、24ビットのFLACファイルを書き出している。デスクトップアプリはTauriで動作するため、設計上、ネイティブ側はRustになっている。リンターについては、ルールごとにアドオンやWebAssemblyモジュールを用意せず、エンジンごとに1つのネイティブアドオンをビルドしている。

| 部品                                   | 言語                   | 理由                           |
| -------------------------------------- | ---------------------- | ------------------------------ |
| アプリ、ワーカー、CLI、リントルール    | TypeScript with Effect | デフォルト                     |
| リンターエンジン (y8, fu4, h56m, wism) | Rust                   | 既存ツールと比較したパース速度 |
| ステム分離、音声ダウンロード           | Rust                   | モデル推論と音声コーデック     |
| デスクトップアプリのネイティブ側       | Rust                   | Tauri                          |

## 型はEffect Schemaで一度だけ定義される

2つの言語をまたぐ型は、Effect Schemaとしてのみ定義される。Rustの構造体やenumは[effect2rs](/slog/effect2rs)によってそこから生成され、生成されたファイルの横に誰かが手動でいずれかを書き込むと、チェックが失敗する。effect2rsが登場する前、私の最初のデスクトップアプリのプロトコルは2回書かれ、すべての変更を両方のコピーで行わなければならなかった。

TypeScript側のスキーマも検証するため、方向はTypeScriptからRustである。Rust側から届くメッセージをデコードするため、両者の不一致は、後で誤った値として現れるのではなく、境界部分でデコードエラーとして表示される。

## 1つのトレースで両方の言語をカバーする

TypeScriptがRustエンジンを呼び出すと、Rust側は呼び出し元のトレースの下にスパンを報告する。Effectスパンは`traceparent`をネイティブアドオンに渡し、呼び出しが完了するとアドオンはOTLP経由でそのスパンをエクスポートする。そのため、低速なリント実行では、TypeScript側とRustエンジン側のスパンが並んだ1つのトレースとして表示される。このトレースがなければ、どの部分をRustへ移すべきか判断できず、最初のセクションのルールは推測頼みとなる。

## TypeScriptのツールチェーン自体がRustで動作するようになった

TypeScript側までもがRustによってチェックされている。2026年10月、CloudflareとVoidZeroはOxcプロジェクト内でTypeScript 7コンパイラをRustに移植したtsrsを発表した[^cloudflare-tsrs]。Vite+ 1.7.0以降、tsrsで動作する`vp check`の型チェックと型認識付きリントが利用可能となり、私は11月17日にモノレポを切り替えた。4コア、4,242ファイルを対象に、`vp check`の所要時間は193〜212秒から100〜108秒に、メモリ使用量は10.8 GiBから最大7.7 GiBに短縮された。

[^cloudflare-tsrs]: [Introducing tsrs: a Port of TypeScript to Rust, The Cloudflare Blog](https://blog.cloudflare.com/typescript-rust-port/)
