---
title: "decision model"
description: "文章を生成せず、入力と質問を読んで答えごとの確率を返す AI モデルの一種。2026年9月の Jev から始まり、2か月で十数社が参入した。"
tags: ["大規模言語モデル", "AI の評価", "2026年のソフトウェア"]
published: true
infobox:
  - label: "別名"
    value: "System One モデル"
  - label: "最初のモデル"
    value: "Jev（TypeSafe AI、2026年9月15日）"
  - label: "代表的な API"
    value: "System One API（/v1/systemone）"
  - label: "問いの種類"
    value: "Noul、Choice、Score ほか"
  - label: "課金"
    value: "多くは入力トークンだけ"
---

decision model は、テキストを生成しない AI モデルの一種である。入力と質問を受け取り、質問が許容する各回答に対する確率を返す。最初のモデルをリリースした TypeSafe AI は、この種類を System One モデルと呼んでいる[^typesafe-launch]。

## 仕組み

言語モデルは、回答を1トークンずつ書き出す。decision model は、入力とすべての選択肢を1回のフォワードパスで読み込み、選択肢へ一度にスコアを付ける。ほとんどのベンダーは入力トークンのみを課金の対象とし、出力は無料にしている[^typesafe-launch][^liquid-docs]。

Strands Decider は、これを構築する1つの方法を示している。学習済みの言語モデルから次のトークンを予測するヘッドを外し、約100万個のパラメータからなる小さなヘッドを付ける。このヘッドは、回答位置の隠れ状態と、各選択肢の最終トークンの隠れ状態を比べる[^strands-repo]。

1つの入力に多くの質問をしても、費用は1問のときとあまり変わらない。入力は一度だけ読み込まれ、各質問は自身のトークンのみを追加する[^strands-repo]。Gemini Decision 1 は、1回のリクエストに最大1,000問まで載せられる[^gemini-blog]。

## 質問の種類

ほとんどのモデルに共通する質問の種類が3つある。Noul は「はい」か「いいえ」の質問に対し、「はい」の確率を返す。Choice は複数の選択肢から1つを選ぶ。Score は、入力を順序付きのルーブリックに位置づける[^strands-repo][^gemini-blog]。

後続のモデルではさらに多くの種類が追加された。Jev 1.14 では、画像内の領域を特定する Box が追加された[^typesafe-docs]。Liquid d1.2 では、数値、日付、範囲、およびテキストのスパンが追加された[^liquid-docs]。Perplexity Decider v1.3 では、一致するテキストとその位置を返す Locate が追加された[^pplx-x]。

## System One API

TypeSafe AI は、パス `/v1/systemone` で Jev を提供している。リクエストには、入力として `state` と名前付きの質問の組が渡される[^typesafe-docs]。Cloudflare Clef、Liquid d1、Strands Decider は、いずれも同じ形式でリクエストを受け付ける[^clef-changelog][^liquid-docs][^strands-repo]。Perplexity は、同じ API で Decider を提供するラッパーを配っている[^decidebench]。

## 歴史

TypeSafe AI は2026年9月15日、初の System One モデルとして Jev をアーリーアクセスでリリースした。名称は、ダニエル・カーネマンの『ファスト＆スロー』における「速い System 1」の考え方に由来している[^typesafe-launch]。

他のベンダーも数週間以内に追随した。Cloudflare は2026年10月1日に Clef と Clef Flash をオープンウェイトとしてリリースし、Workers AI で提供している[^clef-changelog]。Liquid AI は2026年10月5日に d1 をリリースした[^liquid-d1]。AWS Strands Labs もほぼ同時期に Strands Decider 2B をオープンソースとして公開した[^marktechpost-strands]。OpenAI は GPT-6 Luna 上で動作する Decisions API を提供している。

2026年11月にもリリースが続いた。Google は11月11日に Gemini Decision 1 をリリースした[^gemini-blog]。Perplexity は11月12日頃、Decider v1.3 および Decider Flash v1.3 をオープンウェイトとしてリリースした[^pplx-x]。Liquid AI は d1.2 および d1.2-ultra を、Microsoft は Microsoft-Decision-1.1 をリリースした[^openrouter-models]。

2026年11月3日、TypeSafe AI は decision model という呼び名に異議を唱えた。モデルは判断をするだけで、決定を下すのはコードであると主張した[^typesafe-name]。

## モデル

2026年11月18日時点の主なモデルを以下に示す。

- TypeSafe AI の Jev 1.14 は API のみで提供されており、100万入力トークンあたり0.042米ドルである[^typesafe-docs]。
- Cloudflare の Clef は27B パラメータ、Clef Flash は9B パラメータで、Clef Omni は音声や動画も読み込める。Clef Flash の料金は、Workers AI で入力トークン100万個あたり0.038米ドルである[^clef-docs]。
- Liquid AI の d1.2 は、テキスト、画像、音声を読み込み、100万入力トークンあたり0.02米ドルである。オープンウェイトの d1-2B は LFM3 に基づいている[^liquid-docs]。
- AWS Strands Labs の Strands Decider は Apache 2.0 のオープンソースで、Qwen3.5 と Gemma 4 を基にした2B から26B までの版がある。その学習レシピと研究記録も公開されている[^strands-repo]。
- Google の Gemini Decision 1 は、テキスト、画像、音声、動画、PDF ファイルを読み込み、100万入力トークンあたり0.10米ドルである[^gemini-blog]。
- Perplexity の Decider v1.3 は27B のオープンウェイトモデルであり、Decider Flash v1.3 は4B モデルである[^pplx-x]。
- Nace AI の Drex Max と Fastino Labs の GLiDE が、Artificial Analysis Decision Index v2 で首位に並んだ[^aa-v2]。

## 評価

複数のベンチマークが並び立っている。Artificial Analysis は2026年10月13日に Decision Index を公開し、11月8日に v2 として作り直した。v2 では指数の45%に非公開のデータが使われ、スコアは正解率が高いほど上がり、Brier スコアが悪いほど下がる。Drex Max v1.1 と GLiDE v1.2 が73点で decision model の首位となった。ただし、2つの言語モデルはそれより高いスコアを記録した[^aa-v2]。

2026年11月9日に測定された DecideBench v2 でも、同様の結果となった。正解率99.3%を記録した Claude Opus 4.8 に並ぶ decision model は無かった。最も弱かったのは数値を用いたルール適用の分野で、正解率74%を超えた decision model は無かった[^decidebench]。

ベンダー各社は、decision model が自信過剰になりやすいと報告している。このため、Liquid AI は d1-ultra を較正を重視して学習させた[^liquid-ultra]。Strands Decider の報告では、未知の短いタスクにおける信頼度0.9以上の回答の正解率は約95%だった[^strands-repo]。

## masseater.dev での利用

masseater.dev は、自然文のルールをモデルに判定させる lint プラグイン [oxlint-plugin-decision](/sloppedia/oxlint-plugin-decision) で decision model を使っている。このプラグインは Jev と Clef のみを受け付け、既定では上限付きの AI Gateway 経由で Clef Flash を使う。チャットモデルは型とテストで拒否する。

持ち主はまた、[mst-ja-decision-bench](https://masseater.dev/decision-bench/) を用いて、日本語での decision model の性能を測定している。2026年10月11日の測定では、Liquid d1 が16モデル中3位、Clef Flash が11位となった。すべてのモデルが、英語と比べて日本語の業務ルールで約20ポイント正解率を落とした。

Sloppedia の持ち主の masseater は、decision model は毎回の lint やワークフローの各段で走らせられるほど安くて速いと考えている。また、複数の条を組み合わせる日本語のルールはまだ任せられないと考えている。

[^typesafe-launch]: TypeSafe AI「[Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)」2026年9月15日。

[^typesafe-name]: TypeSafe AI「[Don't Call It a Decision Model](https://typesafe.ai/blog/dont-call-it-a-decision-model)」2026年11月3日。

[^typesafe-docs]: TypeSafe AI「[Models](https://docs.typesafe.ai/models)」2026年11月18日に閲覧。

[^clef-changelog]: Cloudflare「[Clef on Workers AI](https://developers.cloudflare.com/changelog/post/2026-10-01-clef-workers-ai/)」2026年10月1日。

[^clef-docs]: Cloudflare「[clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)」2026年11月18日に閲覧。

[^liquid-d1]: Liquid AI「[Introducing d1](https://www.liquid.ai/blog/d1-decision-model)」2026年10月5日。

[^liquid-ultra]: Liquid AI「[d1-ultra](https://www.liquid.ai/blog/d1-ultra)」2026年10月15日。

[^liquid-docs]: Liquid AI「[Decision Models](https://docs.liquid.ai/lfm/models/decision-models)」2026年11月18日に閲覧。

[^strands-repo]: Strands Labs「[strands-decider](https://github.com/strands-labs/strands-decider)」GitHub。2026年11月18日に閲覧。

[^marktechpost-strands]: MarkTechPost「[AWS Strands Labs Releases Strands Decider 2B](https://www.marktechpost.com/2026/10/01/aws-strands-labs-releases-strands-decider-2b/)」2026年10月1日。

[^gemini-blog]: Google「[Gemini Decisions API](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/)」2026年11月11日。

[^pplx-x]: Aravind Srinivas「[Decider v1.3 and Decider Flash v1.3](https://x.com/AravSrinivas/status/2121020114321703210)」X、2026年11月。

[^openrouter-models]: OpenRouter「[Models](https://openrouter.ai/models)」2026年11月18日に閲覧。

[^aa-v2]: Artificial Analysis「[Introducing the Artificial Analysis Decision Index v2](https://artificialanalysis.ai/articles/decision-index-v2)」2026年11月8日。

[^decidebench]: choyiny「[DecideBench](https://github.com/choyiny/decidebench)」GitHub。2026年11月18日に閲覧。
