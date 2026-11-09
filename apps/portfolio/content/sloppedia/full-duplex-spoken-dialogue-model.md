---
title: "Full-Duplex 音声対話モデル"
description: "相手の声を聞きながら同時に話せる音声対話モデル。相づちや割り込みや話し終わる前の返事をモデル自身が扱う。"
tags: ["音声対話モデル", "Full-Duplex", "音声言語モデル"]
published: true
infobox:
  - label: "別名"
    value: "全二重音声対話モデル、Full-Duplex SDM"
  - label: "対になる方式"
    value: "カスケード型、ターン制"
  - label: "最初期の例"
    value: "dGSLM（2022年）"
  - label: "代表例"
    value: "Moshi、GPT-Live、PersonaPlex、Shizuku-Duplex"
  - label: "主なベンチマーク"
    value: "Full-Duplex-Bench"
---

Full-Duplex 音声対話モデルは、相手の声を聞きながら同時に自分も話せる音声対話モデルである。人どうしの会話のように、相づちを打ち、割り込まれたら止まり、相手が話し終わる前に返事を始められる。Full-Duplex は通信の全二重から来た言葉で、日本語では全二重対話とも呼ぶ[^shizuku-blog]。

2024年の [Moshi](/sloppedia/moshi) が最初の実時間で動くモデルとされ、2026年には OpenAI の [GPT-Live](/sloppedia/gpt-live) が ChatGPT の音声会話に入った[^moshi][^gpt-live]。

## ターン制との違い

### カスケード型

従来の音声 AI の多くは、音声認識と LLM と音声合成を順につなぐカスケード型だった。初代の ChatGPT Voice もこの形で、3つのモデルを鎖のようにつないでいた[^gpt-live]。Moshi の論文は、この形には3つの問題があると書く[^moshi]。

- 部品が多いので、やり取りのたびに数秒の遅れが出る
- 間にテキストを挟むので、感情や声以外の音のような、意味を変える情報が落ちる
- 話者の交代で区切るので、声の重なりや割り込みや合いの手を扱えない

### ターン制の音声モデル

ChatGPT の Advanced Voice Mode のように、1つのモデルで音声を受けて音声を返すものもある。ただし、ユーザーが話し終わるのを待ってから返すターン制である。話し終わりを無音で判断するため、短い間や周りの雑音を話し終わりと取り違えて、不自然なところで口をはさむことがあった[^gpt-live]。

### Full-Duplex

Full-Duplex のモデルは、別々のメッセージを順に処理する代わりに、入力を受け続けながら出力を作り続ける。GPT-Live は、発話、傾聴、沈黙、割り込み、ツールの呼び出しの中から次の動きを1秒に何度も選ぶ[^gpt-live]。どこで話し終わったかを外の部品で判定するのではなく、モデル自身が間（ま）を扱う点が違う[^tml]。

## 仕組み

### 声の流れを2本持つ

dGSLM は、2人の話者の声を2つのチャンネルで同時に生成する。テキストやラベルを使わず、2,000時間の2チャンネルの会話音声だけで学習した[^dgslm]。Moshi は、テキストの言語モデルをもとにし、自分の声とユーザーの声を並行する2本の流れとして扱う。これで話者の交代という区切りそのものを無くした[^moshi]。

Moshi は、音声のトークンの前に、時刻をそろえたテキストのトークンを先に出す。論文はこれを Inner Monologue と呼び、話す内容の質が大きく上がったと報告している[^moshi]。理論上の遅延は160ミリ秒、実際は200ミリ秒だった[^moshi]。

### 短い時間の刻み

多くのモデルは、時間を短い刻みに分けて、刻みごとに聞いて話す。[Shizuku-Duplex](/sloppedia/shizuku-duplex) は 80 ms を1つの刻みとし[^shizuku-blog]、Thinking Machines Lab の Interaction Models は 200 ms ぶんの入力と出力を交互に処理する[^tml]。

刻みは黙っている間も進むので、コンテキストが絶えず伸びる。

### 会話と考えごとの分担

会話のテンポを保ったまま調べものや深い推論をするために、会話を受け持つモデルと、裏で重い仕事をするモデルを分ける作りが2026年に広がった。

- GPT-Live は、検索や推論が要る問いを GPT-5.5 に任せ、待つ間も会話を続ける[^gpt-live]
- Thinking Machines Lab は、時間を意識する interaction model と、非同期に動く background model を組にした。両者はコンテキストを共有する[^tml]
- 2026年9月の研究は、Full-Duplex の音声モデルが委任のトークンを出し、テキストの LLM にツールを呼ばせる作りを提案した[^frontend-backend]
- NemotronLabs VoiceChat は、ツール呼び出しを1つのモデルの出力の流れとして持つ[^nemotron]

## 主なモデル

| 年   | モデル                 | 開発                  | 特徴                                               |
| ---- | ---------------------- | --------------------- | -------------------------------------------------- |
| 2022 | dGSLM                  | Meta AI ほか          | テキストを使わない2チャンネルの会話生成[^dgslm]    |
| 2024 | Moshi                  | Kyutai                | 実時間で動く最初の Full-Duplex の音声 LLM[^moshi]  |
| 2025 | J-Moshi                | 名古屋大学ほか        | Moshi をもとにした日本語のモデル[^j-moshi]         |
| 2026 | PersonaPlex            | NVIDIA                | 声と役割を指定できる 7B のモデル[^personaplex]     |
| 2026 | Interaction Models     | Thinking Machines Lab | 音声と映像とテキストを扱う研究プレビュー[^tml]     |
| 2026 | GPT-Live               | OpenAI                | ChatGPT の音声会話の標準のモデル[^gpt-live]        |
| 2026 | NemotronLabs VoiceChat | NVIDIA                | ツールを呼べるオープンなモデル[^nemotron]          |
| 2026 | Dessa                  | Block                 | 人の会話音声だけで学習したモデル[^dessa]           |
| 2026 | Shizuku-Duplex         | Shizuku AI            | AI キャラクター向けの日本語のモデル[^shizuku-blog] |

Thinking Machines Lab の研究プレビューは、276B パラメーターで、そのうち 12B が動く MoE のモデルだった。2026年5月の時点で、限られた研究プレビューを開き、年内に広く出す予定としていた[^tml]。

Block の Dessa は、知識を外の LLM に頼らず、会話のデータから得るとされる。MacBook の M4 Max 程度の手元の計算機で動くが、一般には公開されていない[^dessa]。

## 評価

Full-Duplex-Bench は2025年に公開されたベンチマークである。間の扱い、相づち、話者の交代、割り込みへの対応を自動の指標で測る[^fdb]。のちの v1.5 は、他人に話しかけた声や周りの話し声に反応してしまうかどうかも測る[^tml]。Thinking Machines Lab と Shizuku AI はこの系統の指標の結果を示した。Shizuku AI は、GPT-Live を測った値を OpenAI の公式値と突き合わせた[^shizuku-blog]。

ICASSP 2026 の HumDial Challenge は、人が録音した2チャンネルの実際の会話を集めて公開し、それをもとに HumDial-FDBench を作った[^humdial]。

## 課題

### 定義のずれ

2026年6月のサーベイは、十を超えるシステムが Full-Duplex を名乗るが、その言葉が指す能力はかなり違うと指摘した[^survey]。どこで二重の判断をするか、どの種類のやり取りに対応するかを、今の用語は区別しない。

同じサーベイは、作りの上では Full-Duplex で動けるのに、実際のふるまいは学習と評価のデータにあるやり取りの型に縛られている、とも書いた。公開の学習データが産業界の非公開のデータより乏しいことを、原因の1つに挙げている[^survey]。

### 長い会話で崩れる

Full-Duplex のモデルは、聞いているだけの間も刻みごとにトークンを作るので、数分でコンテキストを使い切る。2026年10月の研究は、5つの最近のモデルを長い会話で試し、どれも最後には質が落ちるか、コンテキストを使い切ったと報告した。短く区切る窓のモデルも、同じことの繰り返しや沈黙や意味の通らない声に陥った[^collapse]。

Shizuku-Duplex は約5分ごとに会話を要約して作り直すことで、Thinking Machines Lab は長い会話の管理をこれからの課題として、この問題に向き合っている[^shizuku-blog][^tml]。

## 呼び名

dual-plex と呼ばれることがあるが、論文と各社の発表では使われていない。2本の流れを持つ作りを、サーベイは dual-channel、NVIDIA は dual-stream と呼んでいる[^landscape][^personaplex]。

[^moshi]: Alexandre Défossez ほか「[Moshi: a speech-text foundation model for real-time dialogue](https://arxiv.org/abs/2410.00037)」arXiv、2024年9月。

[^gpt-live]: OpenAI「[Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/)」2026年7月8日。

[^tml]: Thinking Machines Lab「[Interaction Models: A Scalable Approach to Human-AI Collaboration](https://thinkingmachines.ai/blog/interaction-models/)」2026年5月。

[^dgslm]: Tu Anh Nguyen ほか「[Generative Spoken Dialogue Language Modeling](https://arxiv.org/abs/2203.16502)」arXiv、2022年3月。

[^j-moshi]: Atsumoto Ohashi ほか「[Towards a Japanese Full-duplex Spoken Dialogue System](https://arxiv.org/abs/2506.02979)」arXiv、2025年6月。Interspeech 2025。

[^personaplex]: NVIDIA ADLR「[NVIDIA PersonaPlex: Natural Conversational AI With Any Role and Voice](https://research.nvidia.com/labs/adlr/personaplex/)」2026年11月9日に閲覧。

[^nemotron]: Jagadeesh Balam ほか「[NemotronLabs VoiceChat](https://arxiv.org/abs/2609.21967)」arXiv、2026年9月。

[^frontend-backend]: 「[A frontend-backend architecture for tool calls in full-duplex speech models](https://arxiv.org/abs/2609.19334)」arXiv、2026年9月。

[^dessa]: TechCrunch「[Block's new voice model sounds eerily human](https://techcrunch.com/2026/10/24/blocks-new-voice-model-sounds-eerily-human/)」2026年10月24日。

[^shizuku-blog]: Ayuto Tsutsumi ほか「[Shizuku-Duplex：自然な間合いで話す日本語 Full-Duplex モデル](https://shizuku.ai/blog/1/)」Shizuku AI、2026年11月8日。

[^fdb]: Guan-Ting Lin ほか「[Full-Duplex-Bench](https://arxiv.org/abs/2503.04721)」arXiv、2025年3月。

[^humdial]: 「[Full-Duplex Interaction in Spoken Dialogue Systems](https://arxiv.org/abs/2604.21406)」arXiv、2026年4月。

[^survey]: 「[A Survey of Full-Duplex Spoken Dialogue Systems](https://arxiv.org/abs/2606.19453)」arXiv、2026年6月。

[^collapse]: Y. Kim ほか「[Why Full-Duplex Speech Models Collapse in Long Conversations](https://arxiv.org/abs/2610.32349)」arXiv、2026年10月。

[^landscape]: Siddhant Arora ほか「[On The Landscape of Spoken Language Models: A Comprehensive Survey](https://arxiv.org/abs/2504.08528)」arXiv、2025年4月。
