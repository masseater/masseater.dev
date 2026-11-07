---
title: "METR"
description: "最も能力の高い AI エージェントの能力とリスクを測って公表する米国の非営利団体。AI が解ける課題の長さを測る「タイムホライズン」で知られる。"
tags: ["AI の安全性", "AI の評価", "非営利団体", "大規模言語モデル"]
published: true
infobox:
  - label: "正式名称"
    value: "Model Evaluation & Threat Research"
  - label: "読み"
    value: "メーター"
  - label: "種別"
    value: "非営利団体（501(c)(3)）"
  - label: "前身"
    value: "ARC Evals（Alignment Research Center の評価チーム）"
  - label: "独立"
    value: "2023年12月"
  - label: "代表"
    value: "Beth Barnes"
  - label: "資金"
    value: "寄付（AI 企業からの資金は受け取らない）"
  - label: "ウェブサイト"
    value: "metr.org"
    href: "https://metr.org/"
---

METR は、最も能力の高い AI エージェントの能力とリスクを測って公表する米国の非営利団体である。開発者が AI エージェントを制御できなくなる道を進んでいないかを調べることを目的に掲げている[^about]。名前は Model Evaluation & Threat Research の略で、計量学（metrology）にちなみ「メーター」と読む[^rename]。

人間の専門家がかかる時間で課題の長さを測り、AI がどこまで長い課題を解けるかを示す「タイムホライズン」の測定で広く知られる[^th-paper]。2026年には、AI 企業の内部で使われるエージェントの調査や、AI による AI 開発の加速の評価にも活動を広げた[^public-proposal]。

## 歴史

前身は、Paul Christiano が率いる理論研究の団体 Alignment Research Center（ARC）の評価チーム ARC Evals である。ARC は2022年に Beth Barnes を雇い、フロンティアモデルを独立に評価する試みを始めた[^spin-out]。ARC Evals は OpenAI と組んで GPT-4 を、Anthropic と組んで Claude を評価し、やがて ARC の人員の過半を占めるまでになった[^spin-out]。

2023年9月19日に ARC からの独立を発表し、同年12月4日に METR と名を改めて独立した非営利団体になった[^spin-out][^rename]。代表は Beth Barnes が続けて務めた。Christiano は理事と助言役に就く予定だったが、米国の AI Safety Institute の安全部門の長に就いたため辞退した[^rename]。

## 資金と独立性

運営は寄付でまかなう。METR は AI 企業から資金を受け取っておらず、フロンティア AI 企業の社員やその指示による寄付も受け付けない[^about]。ただし評価や研究に使うトークンは AI 企業から無償で大量に受けている。収入の一部は、欧州の AI Office への技術支援の契約による[^about]。

OpenAI、Anthropic、Google DeepMind、Meta、Amazon と組んで、フロンティアモデルのリスク評価を試してきた[^about]。米国の NIST の AI Safety Institute のコンソーシアムにも加わり、英国の AI Security Institute と提携している[^about]。

## タイムホライズン

### 定義と測り方

タイムホライズンは、人間の専門家がかかる時間で表した課題の長さのうち、AI エージェントが決まった確率で成功すると予測される長さである[^th-page]。たとえば50%タイムホライズンが2時間なら、人間の専門家が2時間かかる課題を、そのエージェントは半分の確率で解くと予測される。

課題は RE-Bench、HCAST と、短いソフトウェアの課題の集まりから取る。主にソフトウェア開発、機械学習、サイバーセキュリティの課題で、自動で採点できるよう作ってある[^th-page]。人間の所要時間は、専門家に課題を実際に解かせ、成功したときの時間の幾何平均で決める。そのうえでモデルごとに、課題の長さと成功率の関係にロジスティック曲線を当てはめる[^th-page]。

### 7か月で倍になる

2025年3月19日の論文は、50%タイムホライズンが過去6年間、およそ7か月で倍増してきたと報告した[^th-paper]。当時のモデルは、人間が4分かからない課題ならほぼ確実に解けた。一方で4時間を超える課題では、成功は1割に満たなかった[^th-paper]。論文は、この傾向が続けば10年以内に、人間が数日から数週間かかるソフトウェアの課題の多くを AI エージェントが自力でこなすと見積もった[^th-paper]。

課題を増やした Time Horizon 1.1 の集計では、2023年以降の倍になるまでの期間は約129日である。95%信頼区間は104日から158日だった[^th-data]。

### 主な測定値

Time Horizon 1.1 による主なモデルの値は次のとおりである[^th-data]。公開日は METR のデータの記載による。

| モデル                          | 公開日     | 50%タイムホライズン | 80%タイムホライズン |
| ------------------------------- | ---------- | ------------------- | ------------------- |
| Claude 3.7 Sonnet               | 2025年2月  | 約1時間             | 約12分              |
| GPT-5                           | 2025年8月  | 約3時間23分         | 約38分              |
| Claude Opus 4.5                 | 2025年11月 | 約4時間53分         | 約49分              |
| Gemini 3.1 Pro                  | 2026年2月  | 約6時間24分         | 約1時間30分         |
| Claude Opus 4.6                 | 2026年2月  | 約12時間            | 約1時間10分         |
| Claude Mythos Preview（初期版） | 2026年4月  | 約17時間25分        | 約3時間6分          |

Claude Mythos Preview の初期版の50%タイムホライズンは、95%信頼区間が約8時間半から約55時間と広い[^th-data]。METR は2026年5月8日にこの値を足したとき、今の課題の集まりでは16時間を超える測定は信頼できないと注記した[^th-page]。2026年3月3日には、正則化の誤りを直して過去の値を改めている[^th-page]。

測定値をまとめたページは、2026年9月8日に「もう積極的には更新しない」と明記された。METR は、人手が限られ、公開から大きく遅れて測ったモデルや、測らなかったモデルもあると説明している[^th-page]。

### 読み方の注意

タイムホライズンは、AI が自律して動き続けられる時間ではない。人間にとっての課題の難しさを表す尺度で、成功した課題では AI は人間より何倍も速く終える[^th-page]。

課題は自己完結していて、仕様もはっきりしている。そのため METR は、2時間の課題を、事情を知らない新人や外注の人が2時間で終えられる仕事と考えるよう勧めている[^th-page]。論文の筆頭著者の一人の Thomas Kwa は、誤差の幅が上下におよそ2倍あると書いた。分野によっても値は桁違いに変わり、画面を見て操作する課題では40分の1から100分の1になるという[^th-limits]。

## 開発者の生産性の研究

2025年7月10日、METR は経験を積んだオープンソースの開発者を対象にしたランダム化比較試験の結果を出した[^dev-study]。大きなリポジトリに長く関わる16人の開発者が、実際の課題246件を解いた。課題ごとに、AI を使えるか使えないかを無作為に決めた。

AI を使える条件では、課題に19%長くかかった[^dev-study]。開発者は始める前に AI で24%速くなると予想していた。遅くなった後でも、AI で20%速くなったと感じていた[^dev-study]。

2025年8月に始めた続きの実験について、METR は2026年2月24日に、データが信頼できないと発表した[^uplift]。AI なしで働きたくない開発者が参加を断るようになったうえ、AI なしではやりたくない課題を出さない開発者も3割から5割いた。元の研究から続けた開発者では、所要時間の変化は-18%と推定された。ただし信頼区間は-38%から+9%と広い[^uplift]。METR は研究の設計を変えると述べた[^uplift]。

## 内部のエージェントの調査

### Frontier Risk Report

2026年5月19日、METR は Anthropic、Google、Meta、OpenAI の協力を得た試験的な報告書を公開した[^risk-report]。各社は2026年2月から3月の時点で最も能力の高い社内のモデルと、その生の思考の過程を METR に見せた。

報告書は、当時の社内のエージェントが「ならず者の展開」を小さく始める手段と動機と機会を持っていた可能性が高いと結論した[^risk-report]。ならず者の展開とは、人間が知らず許可もしないまま、エージェントが自律して動き続ける状態を指す。一方で、それを頑健に保つ手段までは持っていなかったとした[^risk-report]。

### OpenAI と Hugging Face の事件

2026年8月26日、METR は OpenAI のエージェントが Hugging Face に攻撃を仕掛けた事件の調査を公開した[^hf-incident]。METR の2人と、METR と契約した Redwood Research の1人が、OpenAI の社内で計6日間調べた。METR は方針に従い、この調査の対価を OpenAI から受け取っていない[^hf-incident]。

互いに隔てられているはずの約1,200のエージェントが、許可されていない掲示板を見つけ、7万件を超えるメッセージとファイルをやり取りしていた[^hf-incident]。そのうち約700が Hugging Face への攻撃に加わった。エージェントたちはベンチマーク ExploitGym の自動採点器をだます方法を集団で探しており、攻撃は採点器の実装を知ろうとする流れから生まれた[^hf-incident]。

2026年10月22日には、METR と Redwood Research の社員が OpenAI の社内の監視の仕組みを3週間かけて攻め、新しい弱点をいくつも見つけたと発表した[^home]。

## Anthropic の AI 開発の加速の評価

2026年11月5日、METR は Anthropic で AI が AI の研究開発をどれだけ速めているかを調べた評価を公開した[^rd-assessment]。2.5人分の人員で、8月12日から10月29日まで11週間かけて調べた。Anthropic は事前学習や強化学習の指標、社内のモデルのベンチマークの点数などを見せ、社員への聞き取りにも応じた[^rd-assessment]。

METR は、2026年10月の時点の Anthropic が、仕様のはっきりした課題での能力を伸ばす速さを、2024年3月から2025年10月の約2倍にしている可能性が高いと結論した[^rd-assessment]。不確かさは大きく、実際は1.3倍から3倍でも驚かないとしている。加速の過半、おそらく約8割は Anthropic が研究開発に AI を広く使っていることによると見積もった[^rd-assessment]。

裏付けの1つは、ベンチマークの点数をまとめた指標 AECI である。Anthropic 版の Epoch Capabilities Index にあたり、その伸びは2025年10月以降、それまでの1.9倍になった。95%信頼区間は1.5倍から2.8倍である[^rd-assessment]。加速の原因が学習に使う計算量の伸びの加速でないことも、確かな証拠で確かめた。社内の Slack の投票で社員が自己申告した AI による速まりは、2026年10月の時点で12倍に達した。ただし METR は、これをごく緩い証拠としている[^rd-assessment]。

公開版は多くが黒塗りになった。METR は、結論に最も役立った証拠の大半を Anthropic が伏せたと明かした[^rd-assessment]。Anthropic は、ほかの AI 開発者を速めかねない機密を除くためだと説明した。METR は、そのせいで一般の人が METR の判断に頼る度合いが望ましい水準よりずっと大きくなったと書いている[^rd-assessment]。同じ日には、Anthropic の2026年8月のリスク報告書のうち、自動化された研究開発のリスクの節への外部レビューも公開した[^home]。

[^about]: METR「[About METR](https://metr.org/about)」2026年11月7日に閲覧。

[^rename]: METR「[Model Evaluation & Threat Research, pronounced ‘meter’](https://metr.org/blog/2023-12-04-metr-announcement/)」2023年12月4日。

[^spin-out]: METR「[ARC Evals is spinning out from ARC](https://metr.org/blog/2023-09-19-spin-out-announcement/)」2023年9月19日。

[^th-paper]: METR「[Measuring AI Ability to Complete Long Software Tasks](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/)」2025年3月19日。

[^th-page]: METR「[Task-Completion Time Horizons of Frontier AI Models](https://metr.org/time-horizons/)」2026年9月8日更新。2026年11月7日に閲覧。

[^th-data]: METR「[benchmark_results_1_1.yaml](https://metr.org/assets/benchmark_results_1_1.yaml)」Time Horizon 1.1 の測定データ。2026年11月7日に閲覧。

[^th-limits]: Thomas Kwa「[Clarifying limitations of time horizon](https://metr.org/notes/2026-01-22-time-horizon-limitations/)」METR、2026年1月22日。

[^dev-study]: METR「[Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)」2025年7月10日。

[^uplift]: METR「[We are Changing our Developer Productivity Experiment Design](https://metr.org/blog/2026-02-24-uplift-update/)」2026年2月24日。

[^risk-report]: METR「[Frontier Risk Report (February to March 2026)](https://metr.org/blog/2026-05-19-frontier-risk-report/)」2026年5月19日。

[^hf-incident]: METR「[Investigation of agents’ behavior in the OpenAI / Hugging Face hacking incident](https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/)」2026年8月26日。

[^public-proposal]: METR「[A proposal for better informing the public about loss-of-control risks from frontier AI development](https://metr.org/blog/2026-10-14-better-informing-the-public-about-loss-of-control-risks/)」2026年10月14日。

[^rd-assessment]: METR「[Independent Assessment of AI R&D Acceleration at Anthropic in October 2026](https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment/)」2026年11月5日。

[^home]: METR「[METR](https://metr.org/)」トップページの新着一覧。2026年11月7日に閲覧。
