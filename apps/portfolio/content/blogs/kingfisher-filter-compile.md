---
title: "h56m の検出器の構築に 3 秒かかっていた原因"
description: "Kingfisher の kingfisher-rules が Betterleaks のフィルター用の Vectorscan データベースを毎回コンパイルしていたことを測り、プロセス内のキャッシュで watashi のテストを 214 秒から 5 秒にした記録。"
tags: ["Rust", "Kingfisher", "Vectorscan", "シークレット検出"]
published: true
---

h56m は、[Kingfisher](https://github.com/mongodb/kingfisher) の kingfisher-rules と kingfisher-scanner の上に Rust で書いたシークレット検出器である。ルールは Betterleaks のプリセットの 474 件を TOML から読み込む。Claude Code の会話を watashi-mcp へ送る watashi は、送る前に h56m でシークレットを伏せている。

## 3 秒の内訳

watashi を h56m に切り替えたところ、watashi のテストがタイムアウトするようになった。テストファイル全体で 214 秒かかっていた。テストごとに検出器を作り直していたので、検出器 1 つの構築にかかる時間を段階ごとに測った。

| 段階                                                                                                | 所要時間 |
| --------------------------------------------------------------------------------------------------- | -------- |
| ディスクのキャッシュから本体の Vectorscan データベースを読み込み、ルールの正規表現をコンパイルする  | 60 ms    |
| Betterleaks の `matchesAny` と `findMatch` のフィルター用の Vectorscan データベースをコンパイルする | 約 3 秒  |

kingfisher-rules 3.2.1 は本体の Vectorscan データベースを `~/.cache/kingfisher/rule-cache` に保存し、次の起動で使い回す[^kingfisher-rules-database]。フィルター用のデータベースはこのキャッシュに入らず、`BetterleaksFilterEngine::compile_for_rules` が検出器を作るたびにコンパイルし直す[^kingfisher-betterleaks-filter]。3 秒のほとんどはこのコンパイルだった。

## プロセスの中で 1 度だけ作る

h56m は、コンパイルしたルールのデータベースをプロセス内の表で持つようにした。表のキーはルールの設定である。同じ設定で 2 つ目の検出器を作るときは、1 つ目のデータベースを使い回す。この変更で watashi のテストは 214 秒から 5 秒になった（[#1319](https://github.com/masseater/masseater.dev/pull/1319)）。

## 残っている 3 秒

このキャッシュはプロセスが終わると消える。watashi は Claude Code の hook として動き、hook は呼ばれるたびに新しいプロセスを起動するので、呼び出しごとに 3 秒を 1 度払っている。フィルター用のデータベースは kingfisher-rules の中で作られるため、h56m の側ではこれを消せない。2 つのフィルター用のデータベースを本体と同じキャッシュに保存するよう Kingfisher への要望を書いた。これが入れば、短命なプロセスも本体のキャッシュと同じ 60 ms ほどで起動できる。

[^kingfisher-rules-database]: [kingfisher-rules 3.2.1 の src/rules_database.rs](https://docs.rs/crate/kingfisher-rules/3.2.1/source/src/rules_database.rs)

[^kingfisher-betterleaks-filter]: [kingfisher-rules 3.2.1 の src/betterleaks_filter.rs](https://docs.rs/crate/kingfisher-rules/3.2.1/source/src/betterleaks_filter.rs)
