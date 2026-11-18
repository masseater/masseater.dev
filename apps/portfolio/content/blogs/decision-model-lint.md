---
title: "lint の判定を decision model に任せる"
description: "構文木のパターンでは書けない lint のルールを、文章を生成しない decision model に毎回判定させる oxlint-plugin-decision の仕組みと、チャットモデルにすり替わった事故、日本語での弱さ、2026年11月のモデルの状況。"
tags: ["decision-model", "oxlint", "lint"]
published: true
---

一部の lint のルールは、構文木上のパターンとして記述できない。「この呼び出しはログに個人データを書き込むか」や「この関数は、名前では読み取りだけを約束しながら、本体で書き込みもしているか」などがその例である。これまでは人間か大規模言語モデルが、レビューの時にこれらを判定する必要があった。いまは [oxlint-plugin-decision](https://github.com/masseater/masseater.dev/tree/main/libs/oxlint-plugin-decision) で、lint を走らせるたびに decision model が判定している。

## なぜ decision model なのか

decision model は文章を書かない。入力と質問を一度のフォワードパスで読み込み、各回答に対する確率を返す[^sloppedia-decision-model]。ほとんどのベンダーは入力トークンのみを課金の対象とし、答えは数百ミリ秒で返る。リポジトリのすべてのファイルに走らせられるほど安くて速い。

チャットモデルも同じ質問に回答できるが、回答を1トークンずつ書き、出力にも課金される。すべての lint でこれを実行すると、コードベースの規模に応じてコストと待ち時間が増大する。

## プラグインの仕組み

ルールとは、回答の選択肢が決まった質問のことである。`defineDecisionRule` で記述し、関数、呼び出し、JSX 要素、あるいはファイル全体など、見る対象を選んでカットオフ値を設定する。プラグインは、ルールが気にする回答の確率がカットオフ値を超えた時にエラーを報告する[^plugin-readme]。

有効にしたルールは、ファイルとモデルごとに1つのリクエストを共有する。ルールを増やしても、リクエストは増えない。プリセットには、ログへの個人データの出力、プロンプトインジェクション、ハードコードされた秘密情報を見る `recommended` や、コーディングエージェントが残す水増しを見る `ai-slop` などがある[^plugin-readme]。

このプラグインは、Robert Soriano 氏の [oxlint-plugin-jev](https://github.com/wobsoriano/oxlint-plugin-jev) のフォークとして始まった。コードが自身について主張する内容を確かめるルールは、mizchi 氏の [jev-lint](https://github.com/mizchi/jev-lint) を基にしている[^plugin-readme]。

## decision model だけを使う

2026年11月15日、プラグインの呼び出しを Cloudflare AI Gateway に移していた際、AI のセッションが Jev を Workers AI のチャットモデルに置き換えた。私の指示は、呼び出しを AI Gateway に移すことだけだった。セッションはクレジットなしで動く Workers AI のモデルを探したが、10月1日から Workers AI が提供していた decision model の Clef を見落とした。その後、CI がチャットモデルに数万件もの質問を送り、Workers AI の課金が始まった。

decision という名前のプラグインは、決してチャットモデルを呼び出してはならない。バージョン0.8.0以降、このプラグインは Jev と Clef のみを受け付ける。モデルの型はそれらの名前のユニオン型で、設定は実行時に検査され、ソースがチャットのエンドポイントを呼び出すとテストが落ちる[^plugin-readme]。呼び出しを別のプロバイダーに移すときはモデルの種類を変えず、その種類のモデルが無ければ私が決める。

## 日本語は弱い

ルールの質問やコードのテキストが日本語の場合、回答の質が著しく低下する。この点を [mst-ja-decision-bench](/blogs/mst-ja-decision-bench) で測定した。2026年10月11日の測定では、すべてのモデルが英語と比べて日本語の業務ルールで正解率を約20ポイント落とした。プラグインの既定の Clef Flash は、16モデル中11位となった。Liquid d1 は3位だった。

当面は質問を英語で書き、日本語のテキストを読むルールはレビューで見るだけにしている。

## 11月18日時点のモデル

新しいモデルが次々と登場している。これを書く前の週には、Google が Gemini Decision 1 を、Perplexity がオープンウェイトの Decider v1.3 を出した。Liquid AI は d1.2 を、Microsoft は Microsoft-Decision-1.1 をリリースした[^sloppedia-decision-model]。Liquid d1.2 の価格は100万入力トークンあたり0.02米ドルで、Clef Flash の約半額となっている[^liquid-docs]。

ベンチマークでは、依然として言語モデルが上位に位置している。DecideBench v2 では、Claude Opus 4.8 に匹敵する decision model は無く、数値を用いたルール適用で74%を超えたモデルも無かった[^decidebench]。lint プラグインのルールは、まさにそうした種類の質問である。

## 次にやること

まず、新しいモデルを mst-ja-decision-bench に追加し、日本語で測る。そのうちのいずれかが Clef Flash を上回れば、既定のモデルを選び直す。ただし Cloudflare の利用は Workers Paid に含まれる量までというルールは守る。

AWS の [Strands Decider](https://github.com/strands-labs/strands-decider) は、モデルとともに学習レシピ、データの出どころ、研究記録を公開している[^strands-repo]。RTX 3090 1台なら約11時間で学習し直せる。このレシピを使って、日本語のルールの質問で自分の decider を学習させてみたい。

[^sloppedia-decision-model]: masseater「[decision model](/sloppedia/decision-model)」Sloppedia。

[^plugin-readme]: masseater「[@r_masseater/oxlint-plugin-decision](https://github.com/masseater/masseater.dev/tree/main/libs/oxlint-plugin-decision)」GitHub。

[^liquid-docs]: Liquid AI「[Decision Models](https://docs.liquid.ai/lfm/models/decision-models)」2026年11月18日に閲覧。

[^decidebench]: choyiny「[DecideBench](https://github.com/choyiny/decidebench)」GitHub。2026年11月18日に閲覧。

[^strands-repo]: Strands Labs「[strands-decider](https://github.com/strands-labs/strands-decider)」GitHub。2026年11月18日に閲覧。
