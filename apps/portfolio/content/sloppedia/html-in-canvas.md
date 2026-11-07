---
title: "HTML-in-Canvas"
description: "`<canvas>` の中に置いた HTML の要素を、ブラウザーがレイアウトした見た目のまま canvas に描く Web の API。WICG で提案され、2026年11月の Chrome 157 で既定で有効になった。"
tags: ["Web 標準", "Canvas", "HTML", "Google Chrome", "2026年のソフトウェア"]
published: true
infobox:
  - label: "提案の場"
    value: "WICG（Web Platform Incubator Community Group）"
  - label: "仕様"
    value: "WHATWG HTML への pull request（#11588）"
  - label: "主な API"
    value: 'drawElementImage()、paint イベント、content="drawable"'
  - label: "使える文脈"
    value: "Canvas 2D、WebGL、WebGPU、OffscreenCanvas"
  - label: "Chrome"
    value: "157 で既定で有効（2026年11月3日）"
  - label: "Safari"
    value: "賛成。WebKit で実装中"
  - label: "Firefox"
    value: "態度は未表明"
  - label: "情報源"
    value: "WICG/html-in-canvas"
    href: "https://github.com/WICG/html-in-canvas"
---

HTML-in-Canvas は、`<canvas>` の子として置いた HTML の要素を、ブラウザーがレイアウトした見た目のまま canvas に描く Web の API である[^explainer]。Canvas 2D の `drawElementImage()` と、WebGL・WebGPU で要素をテクスチャにする同じ働きの関数からなる。描いた要素は DOM に残るので、文字の選択や入力、支援技術への公開もそのまま働く[^explainer]。

WICG で提案され、仕様は WHATWG の HTML への変更として議論されている[^chromestatus]。Chrome は 2026年11月3日に出た 157 で既定で有効にした[^chromestatus][^chromium-dash]。

## 背景

canvas は描く処理を細かく制御できる代わりに、HTML と CSS が持つ機能を失う。`fillText()` は文字を折り返せず、描いた文字は画像になるので、選択や検索、支援技術での読み上げができない[^explainer][^ikeda]。グラフの凡例、作画ツールの文章、ゲームのメニューのように、canvas の中で整った文字を出したい場面は多い[^explainer]。

開発者は、canvas の上に HTML を重ねるか、文字組やフォームを JavaScript で作り直すかを選ぶしかなかった[^webgpu-com]。SVG の `<foreignObject>` に HTML を入れて画像にする方法もあるが、外部の画像やフォントを読めず、入力もできない[^ikeda]。

## 仕組み

説明書は次の5つの部品を挙げている[^explainer]。

| 部品                    | 役割                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `content` 属性          | `drawable` にすると、canvas の子孫が代替の内容ではなくレイアウトされる |
| `drawable` 属性         | 描く対象の要素に付ける                                                 |
| `paint` イベント        | 描く対象の見た目が変わると、描画の更新のたびに届く                     |
| `drawElementImage()`    | 要素の最新の見た目を canvas に描く                                     |
| `updateElementGeometry` | canvas 上の位置を DOM に返し、クリックの判定と支援技術に使わせる       |

基本の書き方は次のとおりである[^explainer]。

```html
<canvas content="drawable">
  <form drawable>
    <label for="name">name:</label>
    <input id="name" />
  </form>
</canvas>
<script>
  const canvas = document.querySelector("canvas");
  const form = document.querySelector("canvas form");
  const ctx = canvas.getContext("2d");
  canvas.onpaint = () => {
    ctx.reset();
    ctx.drawElementImage(form, 100, 0);
  };
</script>
```

Canvas 2D の `drawElementImage()` は、描いた位置を要素の位置として自動で DOM に返す。WebGL の `texElementSubImage2D()` と WebGPU の `drawElementImageToTexture()` では、ブラウザーがテクスチャの中の位置からページ上の位置を求められない。そのため開発者が `updateElementGeometry` を呼ぶ[^explainer]。止まらずに描き続けるアプリのために、`requestAnimationFrame()` に似た `requestPaint()` もある。`captureElementImage()` で取り出した見た目は、Worker に渡して `OffscreenCanvas` に描ける[^explainer]。

### 漏らさない情報

描いた結果はピクセルとして読み出せる。そのため、ページのスクリプトがほかの方法で知り得ない情報は、描かれる絵にも `paint` イベントの起こり方にも含めない[^explainer]。他のオリジンの画像や iframe の中身、システムの色や設定、スペルチェックの印、訪れたリンクかどうか、自動入力の候補、サブピクセルのアンチエイリアス、IME の表示などがこれに当たる[^explainer]。

### アクセシビリティ

`content="drawable"` の canvas の子孫は、普通の DOM と同じようにアクセシビリティツリーに入る。位置を DOM に返していない要素は、位置の情報を持たずに公開される[^explainer]。フォーカスの枠や入力のカーソルも、要素と一緒に canvas へ描かれる[^explainer]。

## 経緯

Chrome Platform Status への登録は2024年6月である[^chromestatus]。Chrome は 138 から、`chrome://flags/#canvas-draw-element` を有効にしたときだけ使える開発者向けの試験を始めた。148 から 150 までは、サイトごとに申し込むオリジントライアルを行った[^chromestatus][^webgpu-com]。

2026年5月の Google I/O で、Chrome の Thomas Nattestad が紹介した[^webgpu-com]。このころの API では、canvas に `layoutsubtree` 属性を付けていた。開発者は `drawElementImage()` が返す行列を、要素の CSS の `transform` へ自分で当てていた[^webgpu-com]。のちに属性は `content="drawable"` と `drawable` へ変わった。`drawElementImage()` は値を返さなくなり、描いた位置を自動で DOM へ返す[^issue-174][^explainer]。

Chrome は 157 で既定で有効にした。157 の安定版は2026年11月3日に配信された[^chromestatus][^chromium-dash]。

## 各ブラウザーの対応

| ブラウザー | 2026年11月7日の時点                                                  |
| ---------- | -------------------------------------------------------------------- |
| Chrome     | 157 で既定で有効                                                     |
| Edge       | Chromium をもとにする。2026年10月11日の時点では 155 でフラグが要った |
| Safari     | WebKit は標準化に賛成し、実装を始めている                            |
| Firefox    | Mozilla は態度を表明していない                                       |

表の Chrome・Safari・Firefox は Chrome Platform Status に[^chromestatus]、Edge は池田泰延の発表資料に基づく[^ikeda]。

## 使われ方

three.js では、作者の mrdoob が `HTMLTexture` を足す変更を試している[^explainer]。PlayCanvas も対応を出した[^webgpu-com]。Babylon.js は、新しい API に合わせて型の定義を直した[^babylon]。エフェクトの VFX-JS や Canvas UI、PixiJS も対応している[^ikeda]。

日本では、ICS の池田泰延が、2026年10月12日のフロントエンドカンファレンス関西2026で自作のデモとともに解説した。発表の内容は「[HTML-in-Canvasで作る未来のWeb UI表現](/sloppedia/html-in-canvas-future-web-ui)」の記事にまとめている[^ikeda]。

[^explainer]: WICG「[HTML-in-Canvas](https://github.com/WICG/html-in-canvas)」GitHub。2026年11月7日に閲覧。

[^chromestatus]: Chrome Platform Status「[HTML-in-canvas](https://chromestatus.com/feature/5172548013916160)」。2026年11月7日に閲覧。

[^chromium-dash]: Chromium Dash「[Chrome 157 のスケジュール](https://chromiumdash.appspot.com/schedule)」。2026年11月7日に閲覧。

[^webgpu-com]: WebGPU.com「[Google Introduces HTML-in-Canvas API](https://webgpu.com/news/google-html-in-canvas-webgl-webgpu/)」2026年。

[^issue-174]: WICG「[Breaking change announcement: drawElementImageToTexture, texElementSubImage2D, …](https://github.com/WICG/html-in-canvas/issues/174)」GitHub。

[^babylon]: Babylon.js「[Update HTML-in-Canvas typings to the latest WICG explainer API](https://github.com/BabylonJS/Babylon.js/pull/19116)」GitHub Pull Request #19116。

[^ikeda]: 池田泰延「[HTML-in-Canvasで作る未来のWeb UI表現](https://speakerdeck.com/clockmaker/html-in-canvas)」Speaker Deck。フロントエンドカンファレンス関西2026、2026年10月12日。
