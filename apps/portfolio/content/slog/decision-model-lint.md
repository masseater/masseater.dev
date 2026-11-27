---
title: "lint の判定を decision model に任せる"
description: "oxlint-plugin-decision が、テキストを生成しない decision model に、構文木パターンとして記述できない lint ルールをどう判定させるか、チャットモデルに切り替えた件、日本語の弱点、2026年11月時点のモデル。"
tags: ["decision-model", "oxlint", "lint"]
published: true
---

一部のリントルールは、構文木上にパターンとして記述できない。「この呼び出しはログに個人データを書き込むか」や「この関数名は読み取りを約束しているのに、本体は書き込みもしているか」などがその例である。人間や大規模言語モデルが、レビュー時にこれらを判定する必要があった。現在では、[oxlint-plugin-decision](https://github.com/masseater/masseater.dev/tree/main/libs/oxlint-plugin-decision) を用いて、リント実行のたびにdecision modelがこれらを判定している。

## なぜ decision model なのか

decision modelはテキストを書き込まない。入力と質問を1回のフォワードパスで読み込み、各回答に対して確率を返す[^sloppedia-decision-model]。ほとんどのベンダーは入力トークンのみを課金し、回答が返ってくるまで数百ミリ秒かかる。これは安価で、リポジトリ内のあらゆるファイルを処理できるほど高速だ。

チャットモデルは同じ質問に回答できるが、回答をトークン単位で記述し、出力に対して課金される。すべてのリントに対してこれを実行すると、コードベースの規模に応じてコストと待ち時間が増大する。

## プラグインの仕組み

ルールとは、固定された回答セットを持つ質問のことだ。`defineDecisionRule` で記述し、関数や呼び出し、JSX 要素、あるいはファイル全体など、参照対象を選択してカットオフ値を設定する。プラグインは、ルールが対象とする回答の確率がカットオフ値をクリアした際にエラーを報告する[^plugin-readme]。

有効化されたルールは、ファイルおよびモデルごとに1つのリクエストを共有する。ルールをさらに有効化しても、リクエストが追加されることはない。本プラグインには、ログ内の個人データ、プロンプトインジェクション、ハードコードされたシークレット用の `recommended` と、コーディングエージェントが残すパディング用の `ai-slop` といったプリセットが同梱されている[^plugin-readme]。

このプラグインは、Robert Soriano氏による[oxlint-plugin-jev](https://github.com/wobsoriano/oxlint-plugin-jev)のフォークとして始まった。コードが自身について主張する内容をチェックするルールは、mizchi氏による[jev-lint](https://github.com/mizchi/jev-lint)から転用されたものである[^plugin-readme]。

## decision modelのみ

2026年11月15日、プラグインの呼び出しをCloudflare AI Gatewayに移行していた際、AIセッションによってJevがWorkers AIのチャットモデルに置き換えられた。私の指示は、呼び出しをAI Gatewayに移行することだけだった。セッションはクレジットなしで動作するWorkers AIモデルを探したが、10月1日からWorkers AIが提供していたdecision modelであるClefを見落とした。その後、CIがチャットモデルに数万件もの質問を送信し、Workers AIが課金を開始した。

「decision」という名前のプラグインは、決してチャットモデルを呼び出してはならない。バージョン 0.8.0 以降、このプラグインは Jev と Clef のみを受け付ける。モデルの型は両者の名称のユニオン型であり、設定は実行時にチェックされ、ソースがチャットエンドポイントを呼び出すとテストは失敗する[^plugin-readme]。呼び出し先が別のプロバイダーに変更された場合でも、モデルカテゴリは変更されず、そのカテゴリのモデルが利用できない場合は、オーナーが決定する。

## 日本語は弱い

ルールの質問やコードのテキストが日本語の場合、回答の質が著しく低下する。この点を [mst-ja-decision-bench](/slog/mst-ja-decision-bench) で測定した。2026年10月11日の測定において、すべてのモデルが英語と比較して日本語の業務ルールで精度が約20ポイント低下した。プラグインのデフォルトである Clef Flash は、16モデル中11位だった。Liquid d1 は3位だった。

当面は質問を英語で書き、日本語のテキストを読むルールはレビューのみにとどめておく。

## 11月18日時点のモデル

新しいモデルが次々と登場している。これを書く前の週、GoogleはGemini Decision 1を、Perplexityはオープンウェイト版のDecider v1.3をリリースした。Liquid AIはd1.2を、そしてMicrosoftはMicrosoft-Decision-1.1をリリースした[^sloppedia-decision-model]。Liquid d1.2は入力100万トークンあたり0.02米ドルで、Clef Flashの約半額となっている[^liquid-docs]。

ベンチマークでは、依然として言語モデルが上位に位置している。DecideBench v2では、Claude Opus 4.8に匹敵するdecision modelはなく、数値を用いたルール適用で74%を突破したモデルも存在しなかった[^decidebench]。リントプラグインのルールは、まさにそうした類のものだ。

## 次にやること

まず、新しいモデルを mst-ja-decision-bench に追加し、日本語で計測する。そのうちのいずれかが Clef Flash を上回る場合は、Cloudflare の利用をプランに含まれる量までとするコストルールの範囲内で、デフォルトを選び直す。

AWSの[Strands Decider](https://github.com/strands-labs/strands-decider)は、モデルの学習レシピ、データソース、リサーチログを公開している[^strands-repo]。RTX 3090 1台で、約11時間で再学習できる。このレシピを使って、日本語のルール問題で自作のdeciderを学習させてみたい。

[^sloppedia-decision-model]: masseater「[decision model](/sloppedia/decision-model)」Sloppedia。

[^plugin-readme]: masseater「[@r_masseater/oxlint-plugin-decision](https://github.com/masseater/masseater.dev/tree/main/libs/oxlint-plugin-decision)」GitHub。

[^liquid-docs]: Liquid AI「[Decision Models](https://docs.liquid.ai/lfm/models/decision-models)」2026年11月18日閲覧。

[^decidebench]: choyiny「[DecideBench](https://github.com/choyiny/decidebench)」GitHub。 2026年11月18日閲覧。

[^strands-repo]: Strands Labs「[strands-decider](https://github.com/strands-labs/strands-decider)」GitHub。2026年11月18日閲覧。
