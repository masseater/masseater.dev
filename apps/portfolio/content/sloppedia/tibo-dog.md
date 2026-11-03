---
title: "tibo.dog"
description: "SpaceXSI のエンジニア poteto が Grok Bot と Cursor で4日で作り、2026年11月に公開したブラウザゲーム。X の投稿の中でも遊べる。"
tags: ["ゲーム", "ブラウザゲーム", "AI駆動開発", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発者"
    value: "poteto（Lauren Tan）"
    href: "https://x.com/poteto"
  - label: "公開"
    value: "2026年11月1日（UTC）"
  - label: "ジャンル"
    value: "サバイバーズライク（2.5D ピクセルアート）"
  - label: "プラットフォーム"
    value: "Web ブラウザ、X の投稿の埋め込み"
  - label: "開発の道具"
    value: "Grok Bot、Cursor"
  - label: "描画"
    value: "three.js"
  - label: "対応言語"
    value: "27言語（2026年11月3日時点）"
  - label: "価格"
    value: "無料"
  - label: "公式サイト"
    value: "tibo.dog"
    href: "https://tibo.dog/"
---

tibo.dog は、SpaceXSI で Grok Bot の開発に携わるエンジニアの poteto（Lauren Tan）が作り、2026年11月1日（UTC）に公開した無料のブラウザゲームである[^launch][^about][^behind-craft]。プレイヤーは主人公の Tibo を操作し、最大3匹の犬の群れを連れて害虫やボスの群れから20分間生き延びる。ジャンルは、武器が自動で攻撃し、プレイヤーは移動とレベルアップ時の強化の選択だけを受け持つサバイバーズライクである[^about]。

poteto は、ゲームを SpaceXSI のエージェント製品 Grok Bot と、コードエディタの Cursor で作ったと述べている[^launch]。開発期間は4日で、その間に約1,150件のプルリクエストをマージした[^trivia]。費用として挙げたのは、5.99ドルで買ったドメインの代金だけである[^launch]。

ゲームは Web ブラウザで動くほか、X の投稿に貼られたカードの中でもそのまま遊べる[^launch][^about]。公開の投稿は、2026年11月3日時点で190万回以上表示された[^launch]。

## 背景

報道によれば、tibo.dog の題材は、AI 企業の社員どうしが X 上で続けていたからかい合いである[^officechai]。OfficeChai によれば、OpenAI の Tibo（Thibault Sottiaux）がドメイン poteto.com を取り、ChatGPT へ転送させた。これに Meta の最高 AI 責任者アレクサンドル・ワンが加わり、thibaultsottiaux.com を取って Meta のアシスタント Muse へ転送させた[^officechai]。2026年11月3日時点で、thibaultsottiaux.com は muse.ai へ転送されている[^note-redirect]。

poteto はこれに対し、Tibo を主人公にしたゲームを作って応じた[^officechai]。AGTP の要約によれば、ドメインに tibo.dog を選んだのは、tibo.com が手に入らず、「dot」と打つと「dog」に自動で直されることに目を付けたためである[^agtp]。

公開の投稿の冒頭には「Day 28/」とある。この番号が何を数えているかは、投稿と報道のどちらにも説明が無い[^launch]。

## ゲームの内容

プレイヤーは Tibo を動かし、ダッシュで敵をかわす。Tibo の持つジャガイモの武器は自動で撃たれる。道中で野良犬が群れに加わり、同時に連れられるのは3匹までである。レベルが上がるたびにカードを1枚選んで強化し、カードの引き直し・見送り・除外も残り回数の範囲で使える[^about]。

遊び方には、短い導入の「ストーリー」と、Easy から Nightmare までの難易度を選ぶレベルがある。レベルでは20分生き延びると勝ちで、その後も倒れるまで続けられる[^about]。

報道によれば、敵は使用量の上限のリセットを求める利用者を表し、最後のボスは Muse を題材にした、アレクサンドル・ワンを模した人物である[^officechai]。Tibo が倒されると、画面には Tibo が「リセットされた」と出る[^agtp]。公式サイトのタイトル画像には、poteto の分身の眼鏡の少女が、Tibo と、鹿の角を付けた Alex という人物に木槌を振りかざす姿が描かれている[^home]。

操作は、キーボードでは移動が WASD か矢印キー、ダッシュが Space、一時停止が P か Escape である。タッチ操作では、画面のどこでもドラッグすれば移動し、はじけばダッシュする[^about]。

## 開発

### 道具と進め方

poteto は公開の直後に、開発の内訳を X に投稿した[^trivia]。それによれば、ゲームは4日前に副業として作り始め、約1,150件のプルリクエストをマージした。コードに問題を見つけるたびに、Grok Bot にその問題を禁じる lint ルールを作らせた。コードコメントも lint ルールで禁じており、説明の要るコードは名前を良くするかテストを書いて直す[^trivia]。

ストーリー、カットシーン、ゲームの各システムの状態機械は、TLA+ による形式検証で不具合を探した。主なシステムごとに、形式検証のためのエージェントのスキルを1つずつ用意した[^trivia]。

### エンジン

ゲームエンジンの大半は自作である。3D の場面の描画には three.js を使い、シミュレーション、ポストプロセス、音声は独自に書いた[^trivia]。

毎フレームや毎ティック動くコードには `.hot.ts` という拡張子を付け、そのファイルの中ではオブジェクトリテラル、クロージャ、`new` などによるメモリの確保を lint ルールで禁じた。これにより、ゲームループはほとんどガベージを生まず、ガベージコレクションによる引っかかりが起きない[^trivia]。

### 決定論的なシミュレーションと不正の検出

poteto によれば、シミュレーションは決定論的で、どの回も入力だけから同じ展開を再現できる。ハイスコアを投稿すると、サーバーが回の全体を再生し、不正が無いかを確かめる[^trivia]。

難易度の調整には、ボットに画面を出さずにゲームを遊ばせ、難易度ごとの目標の生存率に合わせた[^trivia]。

### 音とグラフィック

ゲームには音声ファイルが1つも無い。音楽と効果音は、パルス波2音・波形メモリ音源1音・ノイズからなるゲームボーイ風の自作の音源チップと、シンセウェイブの層を、ブラウザで鳴らしながら合成する。曲はコードの中に文字列で書かれている。poteto がいちばん気に入っている機能として挙げたのは、バイオームが変わると前の旋律を引き継いだまま別の曲へ移る仕組みである[^trivia]。

ピクセルアートもすべてコードで描かれている。スプライトは1枚ごとに1つのファイルで、共通のパレットで描き、ビルド時にスプライトアトラスへまとめる[^trivia]。

### 性能と埋め込み

X の投稿の中では、幅245ピクセルのカードから全画面まで同じゲームが動く。性能の目標は、中程度のスマートフォンで敵500体を表示して毎秒60フレームである[^trivia]。

最初にダウンロードする量が予算を超えるとビルドが失敗する。公開の時点で、その量は gzip 圧縮後に約124キロバイトだった[^trivia]。

公式サイトは X の Player Card の指定を持ち、埋め込みの大きさとして幅480ピクセル・高さ480ピクセルを示している[^home]。

### 多言語対応と共有の画像

公開の時点で対応言語は10だった[^trivia]。2026年11月3日時点の公式サイトは、日本語、中国語、韓国語、アラビア語、ヘブライ語などを含む27言語に対応し、ブラウザの言語に合わせて切り替わると述べている[^about]。回ごとに最終成績を載せた共有用の画像を作り、これも言語ごとに訳される[^trivia]。

## 反響

公開の投稿には、2026年11月3日時点で1万3千以上のいいねと、1,400件以上の返信が付いた[^launch]。題材にされた Tibo は返信で、poteto が計算資源を使い切ったせいでイーロン・マスクがプラグを抜いたと冗談を言った[^tibo-reply]。この返信が引いたのは、Grok Bot の使用量のリセットを求めた利用者に、マスクが同じ日に「Grok Bot を提供する費用が収益に比べて持続できないほど高かった」と答えた投稿である[^musk]。

AGTP は、プレイヤーが成績を投稿し合い、tibo.dog に着想を得た派生作品も現れたと伝えた[^agtp]。

## 外部リンク

- [tibo.dog](https://tibo.dog/)
- [About tibo.dog](https://tibo.dog/about/)
- [tibo.dog の X アカウント](https://x.com/tibo_dog)

[^note-redirect]: 2026年11月3日に HTTP の応答を確かめた結果による。poteto.com は同じ日には www.poteto.com へ転送されており、ChatGPT への転送は確かめられなかった。

[^behind-craft]: Peter Yang「[We Built Grok Bot. Here Are Our 14 Best Bots | Peng Zheng & Lauren Tan](https://creatoreconomy.so/p/grok-bot-team-14-best-bots-peng-zheng-lauren-tan)」Behind the Craft、2026年9月27日。Lauren Tan を Grok Bot の主任エンジニアとして紹介している。2026年11月3日閲覧。

[^launch]: lauren（@poteto）「[Day 28/ tibo's game has landed](https://x.com/poteto/status/2117004709198475365)」X、2026年11月1日。2026年11月3日閲覧。

[^trivia]: lauren（@poteto）「[trivia](https://x.com/poteto/status/2117043478140276847)」X、2026年11月1日。2026年11月3日閲覧。

[^about]: poteto「[About tibo.dog](https://tibo.dog/about/)」tibo.dog。2026年11月3日閲覧。

[^home]: poteto「[tibo.dog](https://tibo.dog/)」tibo.dog。ページのメタデータによる。2026年11月3日閲覧。

[^officechai]: 「[SpaceXAI's Poteto Creates Entire Online Game Named Tibo.dog Trolling OpenAI's Tibo, Meta's Alexandr Wang](https://officechai.com/ai/spacexais-poteto-creates-entire-online-game-named-tibo-dog-trolling-openais-tibo-metas-alexandr-wang/)」OfficeChai。2026年11月2日公開。2026年11月3日閲覧。

[^agtp]: AGTP（@AGTPinsights）「[Poteto just launched a playable Tibo game built with Grok Bot and Cursor](https://x.com/AGTPinsights/status/2117186725042643196)」X、2026年11月2日。2026年11月3日閲覧。

[^tibo-reply]: Tibo（@thsottiaux）「[X への返信](https://x.com/thsottiaux/status/2117151734506397716)」X、2026年11月2日。2026年11月3日閲覧。

[^musk]: Elon Musk（@elonmusk）「[X への返信](https://x.com/elonmusk/status/2116992258520064397)」X、2026年11月1日。2026年11月3日閲覧。
