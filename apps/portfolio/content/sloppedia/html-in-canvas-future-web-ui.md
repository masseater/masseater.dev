---
title: "HTML-in-Canvasで作る未来のWeb UI表現"
description: "ICS の池田泰延が、フロントエンドカンファレンス関西2026で HTML-in-Canvas を自作のデモで解説した発表。HTML に canvas の表現力を足す使い方と、canvas に HTML の機能を足す使い方の両面から説いた。"
tags: ["講演", "HTML-in-Canvas", "Canvas", "フロントエンド", "2026年の講演"]
published: true
infobox:
  - label: "発表者"
    value: "池田泰延（株式会社ICS 代表、@clockmaker）"
  - label: "イベント"
    value: "フロントエンドカンファレンス関西2026"
    href: "https://2026.frontend-conf.osaka.jp/"
  - label: "日付"
    value: "2026年10月12日"
  - label: "会場"
    value: "コングレスクエア グラングリーン大阪"
  - label: "構成"
    value: "8 章"
  - label: "資料"
    value: "Speaker Deck"
    href: "https://speakerdeck.com/clockmaker/html-in-canvas"
  - label: "動画"
    value: "YouTube"
    href: "https://www.youtube.com/watch?v=CRnSDIaGvxY"
---

HTML-in-Canvasで作る未来のWeb UI表現 は、ICS の池田泰延が2026年10月12日のフロントエンドカンファレンス関西2026で行った発表である[^deck]。新しい Web の API の [HTML-in-Canvas](/sloppedia/html-in-canvas) を、自作のデモを使って解説した。HTML と CSS から見た利点と、canvas から見た利点の両面を掘り下げている[^deck]。

資料は Speaker Deck に、動きを含む録画は YouTube に公開された[^deck]。池田は株式会社ICS の代表で、筑波大学の非常勤講師も務め、UI の制作とインタラクションの実装を専門にしている[^deck]。

## 構成

資料は次の8つの章からなる[^deck]。

| 章  | 題                              |
| --- | ------------------------------- |
| 1   | HTML-in-Canvas とは何か         |
| 2   | HTML に canvas の表現力を加える |
| 3   | canvas に HTML の機能を加える   |
| 4   | 実装方法                        |
| 5   | Web アプリへの応用              |
| 6   | 対応ライブラリー                |
| 7   | 対応ブラウザー                  |
| 8   | 類似技術との比較                |

## 内容

### 2つの向き

発表は HTML-in-Canvas の使い道を2つの向きに分けた。1つは HTML に canvas の表現力を加える向きで、もう1つは canvas に HTML の機能を加える向きである[^deck]。

前者の例として、CSS の `filter` や `backdrop-filter` では決まった効果しか掛けられない点を挙げた[^deck]。HTML-in-Canvas なら、ブラウザーがレイアウトした HTML を canvas に取り込み、シェーダーで形と色を変えられる。屈折、渦巻き、波のような歪みや、Liquid Glass 風の表現、画面遷移の演出をデモで見せた[^deck]。

後者の例として、canvas の `fillText()` が文字を折り返せない点を挙げた[^deck]。CSS なら `font-feature-settings: "palt"` で字間を詰め、`line-break: strict` で禁則を厳密にできる。`word-break: auto-phrase` で文節の切れ目で折り返し、`text-autospace` で和文と欧文の間を空けることもできる。その文字組をそのまま canvas に描けると示した[^deck]。canvas の中の `<form>` が DevTools のアクセシビリティツリーに役割と名前つきで現れ、Lighthouse のアクセシビリティの監査を通る例を見せた[^deck]。

### 実装と注意点

実装の手順は、canvas に `content="drawable"`、描く要素に `drawable` を付け、`paint` イベントで `drawElementImage()` を呼ぶ形で説明した[^deck]。Canvas 2D では、`translate()` や `rotate()` で動かしてもクリックの範囲がブラウザーによって自動で合う。一方で、シェーダーで波のように歪めた形はクリックの範囲に反映されない[^deck]。

### Web アプリへの応用

演出だけでなく、普段の開発に役立つ例として、URL から記事カードの PNG を作る道具を示した[^deck]。ブラウザーからは他のサイトの OGP の情報を取れず、Node.js の canvas の部品では日本語の文字組が難しい。そこで、取得は Node.js と React Server Components に任せ、文字組はブラウザーの CSS で行い、HTML-in-Canvas で PNG にしてクリップボードへ写す構成を取った[^deck]。

### 対応状況と比較

対応するライブラリーとして、VFX-JS、Canvas UI、three.js、PixiJS を紹介した[^deck]。2026年10月11日の時点では、Chrome と Edge の 155 はフラグかオリジントライアルが要り、Firefox は未対応で、Safari は WebKit で実装中だった[^deck]。11月3日に出る Chrome 157 で正式に使えるようになる見込みにも触れた[^deck]。

SVG の `<foreignObject>` で HTML を画像にする方法とも比べた[^deck]。

| 比較項目       | SVG の `<foreignObject>`      | HTML-in-Canvas         |
| -------------- | ----------------------------- | ---------------------- |
| CSS の文字組   | SVG の中の HTML に CSS を書く | ページの CSS を使う    |
| HTML の更新    | SVG の画像を作り直す          | `paint` イベントで更新 |
| Web フォント   | 外部の URL から読めない       | ページのフォントを使う |
| 入力・文字選択 | できない                      | できる                 |

最後に、canvas の歴史の中に HTML-in-Canvas を置いた。2004年に WebKit が canvas を入れ、2011年に WebGL 1.0、2018年に OffscreenCanvas、2023年に WebGPU が続いた[^deck]。2026年の HTML-in-Canvas は、そこへ HTML と CSS のレイアウトを持ち込んだと位置づけた[^deck]。

## 引いた発言

資料は、[CSS-Tricks](/sloppedia/css-tricks) の創設者の Chris Coyier が HTML-in-Canvas を「今年もっとも予想外で驚かされた機能」と書いたことを引いた[^deck]。Google Chrome の Una Kravets が Google I/O 2026 で「Web でできることが大きく変わる、めったにない瞬間のひとつ」と述べたことも引いている[^deck]。

[^deck]: 池田泰延「[HTML-in-Canvasで作る未来のWeb UI表現](https://speakerdeck.com/clockmaker/html-in-canvas)」Speaker Deck。フロントエンドカンファレンス関西2026、2026年10月12日。
