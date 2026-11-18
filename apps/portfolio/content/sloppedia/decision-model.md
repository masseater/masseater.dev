---
title: "decision model"
description: "テキストを生成せず、入力と質問を読み込んだ後に各回答の確率を返すAIモデルの一種。2026年9月にJevで始まり、2か月以内に10社以上の企業が参画した。"
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

decision modelとは、テキストを生成しないAIモデルの一種である。入力と質問を受け取り、質問で許可された各回答に対して確率を返す。最初のモデルをリリースしたTypeSafe AIでは、このクラスをSystem One モデルと呼んでいる[^typesafe-launch]。

## 仕組み

言語モデルは、回答を1トークンずつ書き出す。decision modelは、入力とすべての選択肢を1回のフォワードパスで読み込み、選択肢へ即座にスコアを付与する。ほとんどのベンダーは入力トークンのみを課金し、出力には一切料金を課さない[^typesafe-launch][^liquid-docs]。

Strands Deciderは、その構築方法の1つを示している。事前学習済みの言語モデルを用意し、次のトークンを予測するヘッドを除去した上で、約100万個のパラメータからなる小規模なヘッドを付与する。このヘッドは、回答位置における隠れ状態と、各選択肢の最終トークンにおける隠れ状態を比較する[^strands-repo]。

1つの入力に多くの質問をしても、費用は1問のときとあまり変わらない。入力は一度読み込まれ、各質問は自身のトークンのみを追加する[^strands-repo]。Gemini Decision 1は、1回のリクエストで最大1,000問まで受け付ける[^gemini-blog]。

## 質問タイプ

ほとんどのモデルに共通する質問形式が3種類ある。「Noul」は「はい」か「いいえ」の質問をし、「はい」の確率を返す。「Choice」は複数の選択肢から1つを選ぶ。「Score」は入力を順序付きのルーブリックに配置する[^strands-repo][^gemini-blog]。

後続のモデルではさらに多くの型が追加された。Jev 1.14 では、画像内の領域を特定する Box が追加された[^typesafe-docs]。Liquid d1.2 では、数値、日付、範囲、およびテキストのスパンが追加された[^liquid-docs]。Perplexity Decider v1.3 では、一致するテキストとその位置を返す Locate が追加された[^pplx-x]。

## System One API

TypeSafe AIは、パス `/v1/systemone` でJevを提供する。リクエストには、入力として `state` と一連の名前付き質問が渡される[^typesafe-docs]。Cloudflare Clef、Liquid d1、Strands Deciderは、いずれも同様の形式でリクエストを受け付ける[^clef-changelog][^liquid-docs][^strands-repo]。Perplexityは、同一のAPIの背後でDeciderを提供するラッパーを配布している[^decidebench]。

## 歴史

TypeSafe AIは2026年9月15日、初のSystem One モデルとしてJevをアーリーアクセスでリリースした。名称は、ダニエル・カーネマンの『ファスト＆スロー』における「システム1の高速思考」に由来している[^typesafe-launch]。

他のベンダーも数週間以内に追随した。Cloudflareは2026年10月1日にClefとClef Flashをオープンウェイトとしてリリースし、Workers AIで提供している[^clef-changelog]。Liquid AIは2026年10月5日にd1をリリースした[^liquid-d1]。AWS Strands Labsもほぼ同時期にStrands Decider 2Bをオープンソースとして公開した[^marktechpost-strands]。OpenAIはGPT-6 Luna上で動作するDecisions APIを提供している。

2026年11月、リリースが続いた。Googleは11月11日にGemini Decision 1をリリースした[^gemini-blog]。Perplexityは11月12日頃、Decider v1.3とDecider Flash v1.3をオープンウェイトとしてリリースした[^pplx-x]。Liquid AIはd1.2とd1.2-ultraを、MicrosoftはMicrosoft-Decision-1.1をリリースした[^openrouter-models]。

2026年11月3日、TypeSafe AIは「decision model」という用語に異議を唱えた。同モデルは単に判断を下すものであり、決定を下すのはコードであると主張した[^typesafe-name]。

## モデル

2026年11月18日時点の主なモデルを以下に示す。

- TypeSafe AI の Jev 1.14 は API のみで提供されており、入力トークン 100万個あたりのコストは 0.042 USD である[^typesafe-docs]。
- CloudflareのClefは27B、Clef Flashは9Bのパラメータを備えており、Clef Omniは音声や動画の読み込みにも対応している。Clef Flashの料金は、Workers AIにおける入力100万トークンあたり0.038米ドルである[^clef-docs]。
- Liquid AI の Liquid d1.2 はテキスト、画像、音声を読み込み、入力 100 万トークンあたり 0.02 米ドルのコストがかかる。オープンウェイト d1-2B は LFM3 に基づいている[^liquid-docs]。
- Strands Decider（AWS Strands Labs 提供）は Apache 2.0 のオープンソースで、Qwen3.5 および Gemma 4 向けに 2B から 26B までのバージョンが公開されている。トレーニングレシピとリサーチログも公開されている[^strands-repo]。
- GoogleのGemini Decision 1は、テキスト、画像、音声、動画、PDFファイルを読み込み、100万入力トークンあたり0.10米ドルで利用可能である[^gemini-blog]。
- PerplexityのDecider v1.3は27Bのオープンウェイトモデルであり、Decider Flash v1.3は4Bモデルである[^pplx-x]。
- Nace AI の Drex Max と Fastino Labs の GLiDE は、Artificial Analysis Decision Index v2 で首位に並んでいる[^aa-v2]。

## 評価

複数のベンチマークが競合している。Artificial Analysisは2026年10月13日にDecision Indexを公開し、11月8日にv2として再構築した。v2では、インデックスの45%にプライベートデータが使用されており、スコアは正解率に重みを置き、Brierスコアが悪い場合はペナルティを課す。Drex Max v1.1とGLiDE v1.2が73点でdecision modelの中で首位となったが、2つの言語モデルの方がより高いスコアを記録した[^aa-v2]。

2026年11月9日に測定された DecideBench v2 でも、同様の結果となった。正解率99.3%を記録した Claude Opus 4.8 に匹敵する decision model は存在しなかった。最も不十分だったのは数値を用いたルール適用の分野で、74%を超える decision model は現れなかった[^decidebench]。

ベンダー各社は、decision modelが過信しやすい傾向にあると報告している。このため、Liquid AIはキャリブレーションを重視してd1-ultraを学習させた[^liquid-ultra]。Strands Deciderの報告では、未知の短いタスクにおいて、信頼度0.9以上の回答が正しかった割合は約95%に上る[^strands-repo]。

## masseater.dev での利用

masseater.dev では、自然言語で書いたルールをモデルに判定させるリントプラグイン [oxlint-plugin-decision](/sloppedia/oxlint-plugin-decision) で decision model を使用している。このプラグインは Jev と Clef のみを受け付け、デフォルトでは上限付き AI Gateway 経由の Clef Flash が用いられる。チャットモデルについては、型とテストで拒否する。

持ち主はまた、[mst-ja-decision-bench](https://masseater.dev/decision-bench/)を用いて、日本語における decision model の性能を測定している。2026年10月11日の実施において、Liquid d1 は16モデル中3位、Clef Flash は11位となった。すべてのモデルが、英語と比較して日本語の業務ルールにおいて約20ポイントの精度低下を示した。

Sloppediaの持ち主のmasseaterは、decision modelはあらゆるリントやワークフローのステップで動かせるほど安価で高速だと考えている。またmasseaterは、複数の条項を組み合わせた日本語ルールをまだ任せることはできないと考えている。

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
