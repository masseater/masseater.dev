---
title: "Shizuku-Duplex"
description: "Shizuku AI が2026年11月に発表した、聞きながら話せる日本語の Full-Duplex 音声対話モデル。"
tags: ["音声対話モデル", "Full-Duplex", "Shizuku AI", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Shizuku AI"
  - label: "発表"
    value: "2026年11月8日"
  - label: "種類"
    value: "Full-Duplex 音声対話モデル"
  - label: "対応言語"
    value: "日本語"
  - label: "推論の単位"
    value: "80 ms（1 tick）"
  - label: "重みの公開"
    value: "なし（2026年11月9日時点）"
  - label: "技術ブログ"
    value: "shizuku.ai/blog/1"
    href: "https://shizuku.ai/blog/1/"
---

Shizuku-Duplex は、Shizuku AI が開発した日本語の [Full-Duplex 音声対話モデル](/sloppedia/full-duplex-spoken-dialogue-model)である。相手の声を聞きながら自分も話せるので、相づちを打ち、相手が話し終わる前に返事を始められる。2026年11月8日に、同社の X のアカウントが動画つきで発表した[^shizuku-x]。

名前の Duplex は通信の全二重から来ている。「dual-plex」と呼ばれることもあるが、Shizuku AI の発表と技術ブログと報道は、どれも Full-Duplex または全二重と書いている[^shizuku-blog][^pc-watch]。

## 開発元

Shizuku AI は、AI VTuber の[しずく](/sloppedia/shizuku-ai-vtuber)を作るキャラクター AI のスタートアップである。創業者の CEO は小平暁雄で、リアルタイム画像生成の StreamDiffusion の筆頭著者でもある。2026年2月に、a16z が主導するシードラウンドで資金を調達した[^bridge-seed]。

技術ブログの主な著者は、Ayuto Tsutsumi、Kohei Ohno、Yuu Jinnai、Akio Kodaira の4人である[^shizuku-blog]。小平は発表の直後に、GPT-Live 以降で初めての流暢に話せる日本語の Full-Duplex モデルだと日本語で紹介した[^aki-x]。

## 背景

これまでの音声 AI の多くは、音声認識と LLM と音声合成を順につなぐカスケード型だった。話し終わりを検知してから処理を始めるので、返事を待たされ、途中で口をはさめず、相づちも打てない[^shizuku-blog]。

Full-Duplex のモデルは、聞きながら話すので、この間（ま）をモデル自身が扱える。英語では2024年に [Moshi](/sloppedia/moshi) が出ており、2026年7月には OpenAI が [GPT-Live](/sloppedia/gpt-live) を発表した。日本語でも Moshi をもとにした J-Moshi と LLM-jp-Moshi が公開されていた。Shizuku AI は、これらには日本語で賢く対話する力がまだ足りないと見ている[^shizuku-blog]。

## 仕組み

### 80 ms ごとの推論

モデルは 80 ms を 1 tick として動き、毎 tick ユーザーの声を聞いて自分の声を出す。声に出す内容は、声より少し先にテキストで書き出す。ブログはこのテキストを Inner Monologue（ひとりごと）と呼ぶ。いつ話し始め、いつ黙るかは、モデルが自分で決める[^shizuku-blog]。

TensorRT と Triton のカーネルで推論を最適化し、1 tick の処理を 80 ms 以内に収めた[^shizuku-blog]。

### アーキテクチャ

中心は LLM をもとにした Transformer で、アーキテクチャから学習まで新しく設計したとされる。ユーザーの音声は、ストリーミングの音声エンコーダーで連続特徴にしてから入れる。この作りは SALM-Duplex を参考にした[^shizuku-blog]。

1 tick の入力は、ユーザーの音声の特徴と、前の tick に自分が出したテキストと音声トークンである。出力は次の3つである[^shizuku-blog]。

- 音声トークン。デコーダーで波形にする
- Inner Monologue のテキスト
- Action head が選ぶ Live2D のモーション。話している間の気持ちに合ったものを選ぶ

もとにした LLM の名前、パラメーター数、学習データの量と出どころは公開されていない。英語版のブログは、日本語のテキストと音声のデータで学習したとだけ書いている[^shizuku-blog-en]。

### 会話と調べものの分担

会話は interaction model が受け持ち、Web 検索のような重い仕事は background model が非同期にこなす。interaction model は、助けが要ると DELEGATE という特別なトークンを出して依頼する。結果を待つ間も話し続け、届いた結果を自分の言葉で伝える[^shizuku-blog]。

background model の出力は、届いた時点で interaction model の系列に差し込まれる。LLM が裏で知識を補う作りは KAME や Thinking Machines Lab の Interaction Models が先に提案しており、ブログもそれを挙げている[^shizuku-blog]。

### 長い会話の圧縮

Full-Duplex のモデルは、黙っている間もコンテキストが伸び続けるので、会話が長くなると応答が崩れやすい。Shizuku-Duplex は、約5分ごとに対話の内容を要約してコンテキストを作り直す。切り替えは 1 tick 以内に済ませるので、会話は途切れない[^shizuku-blog]。

## 評価

日本語の Full-Duplex モデルを測る公開のベンチマークが無かったので、Shizuku AI は自前の日本語版を作った。場面と指標は英語の Full-Duplex-Bench に、雑談と質問応答は M3-DuplexBench に合わせた[^shizuku-blog]。

同じ手法で英語版も作り、GPT-Live を測った結果が OpenAI の公式値と同じ水準になることを確かめたという。出力の音声は Haas-ja-v1.0 で書き起こし、関連性と自然さは Claude Opus 5.5 が採点した[^shizuku-blog]。

| 指標                                       | Shizuku-Duplex | GPT-Live-1 | J-Moshi-ext | LLM-jp-Moshi-v1 |
| ------------------------------------------ | -------------- | ---------- | ----------- | --------------- |
| 話し終わる前に話し始めた率（低いほどよい） | 10%            | 3%         | 24%         | 24%             |
| 間の途中で話を奪った率（低いほどよい）     | 2%             | 4%         | 36%         | 18%             |
| 相づちで黙った率（低いほどよい）           | 5%             | 12%        | 20%         | 7%              |
| 割り込まれて2秒以内に止まった率            | 89%            | 82%        | 73%         | 29%             |
| 雑談の関連性（10点満点）                   | 6.5            | 8.5        | 3.2         | 2.7             |
| 複数ターンの質問応答の正答率               | 79%            | 95%        | 1%          | 1%              |
| Web で調べる質問の正答率                   | 43%            | 50%        | 2%          | 0%              |

ターンテイキングの6つの指標のうち5つで、Shizuku-Duplex は Full-Duplex のモデルの中で最もよかった。話し終わりから返事までの時間の中央値は0.57秒で、GPT-Live の0.53秒とほぼ同じである[^shizuku-blog]。

応答の中身では GPT-Live に及ばないが、既存の日本語の Full-Duplex モデルは大きく上回った。参考として測った GPT-Realtime と Gemini Live は Full-Duplex ではなく、相づちのような短い声でもほとんど黙ってしまったという[^shizuku-blog]。

数値はすべて Shizuku AI 自身の測定で、2026年11月9日の時点で第三者による追試は出ていない。

## 「初めて」の主張

X の英語の発表は、Shizuku-Duplex を AI キャラクター向けの Full-Duplex 音声合成モデルとして “the world's first” と呼んでいる[^shizuku-x]。日本語のブログは、GPT-Live を除けば日本語で賢い対話ができる初めての Full-Duplex モデルだと書く[^shizuku-blog]。

日本語の Full-Duplex モデルとしては J-Moshi と LLM-jp-Moshi が先にあり、ブログ自身もそれらと比べている。「初めて」は、賢さやキャラクター向けといった条件を付けたうえでの主張である。

## 反応

発表の投稿は、翌日までに約3,500件のいいねと約42万回の表示を集めた[^shizuku-x]。PC Watch などの国内の技術メディアが取り上げたが、内容は Shizuku AI の説明をなぞったものである[^pc-watch]。

Shizuku AI は今後、対話の力を上げ、対応する言語を増やし、音声のほかに Vision と Action にも広げるとしている[^shizuku-blog]。重みや論文や API を公開する予定は、発表の時点では示されていない。

[^shizuku-x]: Shizuku AI「[We're introducing Shizuku-Duplex](https://x.com/ShizukuAILabs/status/2119266216040898635)」X、2026年11月8日。いいねと表示の数は2026年11月9日に確かめた。

[^aki-x]: Aki「[GPT-Live以降初となる、流暢に話せる日本語Full-duplexモデル](https://x.com/cumulo_autumn/status/2119267620801405063)」X、2026年11月8日。

[^shizuku-blog]: Ayuto Tsutsumi ほか「[Shizuku-Duplex：自然な間合いで話す日本語 Full-Duplex モデル](https://shizuku.ai/blog/1/)」Shizuku AI、2026年11月8日。

[^shizuku-blog-en]: Ayuto Tsutsumi ほか「[Shizuku-Duplex](https://shizuku.ai/en/blog/1/)」Shizuku AI、2026年11月8日。英語版。

[^pc-watch]: PC Watch「[相づち・割り込み対応の日本語AI「Shizuku-Duplex」発表](https://pc.watch.impress.co.jp/docs/news/2154838.html)」2026年11月9日に閲覧。

[^bridge-seed]: BRIDGE「[AIバーチャルYouTuber「しずく」のShizuku AI、a16z リードでシードラウンドの資金調達を実施](https://thebridge.jp/2026/02/shizuku-ai-raises-seed-round-led-by-a16z)」2026年2月。
