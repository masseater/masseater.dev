---
title: "h56mの検出器の構築に3秒かかった理由"
description: "Kingfisherのkingfisher-rulesが、Betterleaksフィルター用のVectorscanデータベースを毎回コンパイルし、インプロセスキャッシュによってwatashiのテストを214秒から5秒に短縮した記録。"
tags: ["Rust", "Kingfisher", "Vectorscan", "シークレット検出"]
published: true
---

h56mは、[Kingfisher](https://github.com/mongodb/kingfisher)のkingfisher-rulesとkingfisher-scannerをベースにRustで書かれたシークレット検出器である。TOMLのBetterleaksプリセットから474個のルールを読み込む。Claude Codeの会話をwatashi-mcpに送信するwatashiは、送信前にh56mでシークレットをマスクする。

## 3秒の内訳

watashiをh56mに切り替えたら、watashiのテストがタイムアウトするようになった。テストファイル全体にかかった時間は214秒だった。テストではテストごとに新しい検出器が構築されたため、検出器1つを構築するのにかかる時間を段階的に計測した。

| ステージ                                                                                         | 所要時間 |
| ------------------------------------------------------------------------------------------------ | -------- |
| ディスクキャッシュからメインのVectorscanデータベースを読み込み、ルールの正規表現をコンパイルする | 60 ms    |
| Betterleaksの`matchesAny`および`findMatch`フィルタ向けのVectorscanデータベースのコンパイル       | 約3秒    |

kingfisher-rules 3.2.1 は、メインの Vectorscan データベースを `~/.cache/kingfisher/rule-cache` に保存し、次の起動時に再利用する[^kingfisher-rules-database]。フィルタデータベースはこのキャッシュに格納されず、`BetterleaksFilterEngine::compile_for_rules` は検出器がビルドされるたびにそれらを再コンパイルする[^kingfisher-betterleaks-filter]。3秒の大半はこのコンパイルだった。

## プロセス内で一度だけビルドする

h56m で、コンパイル済みルールのデータベースをプロセス内テーブルに保持するようにした。テーブルのキーはルール設定だ。同じ設定で2つ目の検出器をビルドすると、1つ目の検出器のデータベースが再利用される。この変更で、watashiのテストは214秒から5秒になった([#1319](https://github.com/masseater/masseater.dev/pull/1319))。

## 残りの3秒

このキャッシュはプロセス終了時に消える。watashiはClaude Codeのフックとして動作しており、フックが呼び出されるたびに新しいプロセスが起動するため、呼び出しごとに3秒分のコストが一度発生する。フィルターデータベースは kingfisher-rules 内に構築されているため、h56m の側ではこれを解消できない。Kingfisherに、2つのフィルタデータベースをメインのものと同じキャッシュに保存するようリクエストを書いた。それが入れば、短時間のプロセスであっても、メインキャッシュと同じ約60msで起動できる。

[^kingfisher-rules-database]: [kingfisher-rules 3.2.1 の src/rules_database.rs](https://docs.rs/crate/kingfisher-rules/3.2.1/source/src/rules_database.rs)

[^kingfisher-betterleaks-filter]: [kingfisher-rules 3.2.1 の src/betterleaks_filter.rs](https://docs.rs/crate/kingfisher-rules/3.2.1/source/src/betterleaks_filter.rs)
