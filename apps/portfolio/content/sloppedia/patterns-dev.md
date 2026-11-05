---
title: "Patterns.dev"
description: "JavaScript、React、Vue のデザインパターンと、読み込みや描画の性能のパターンを解説する、Lydia Hallie と Addy Osmani のサイト。"
tags: ["Web", "JavaScript", "デザインパターン"]
published: true
infobox:
  - label: "URL"
    value: "patterns.dev"
    href: "https://www.patterns.dev/"
  - label: "作者"
    value: "Lydia Hallie、Addy Osmani"
  - label: "別名"
    value: "Learning Patterns"
  - label: "料金"
    value: "無料"
---

Patterns.dev は、Web アプリを作るための JavaScript のデザインパターンと性能のパターンを解説するサイトである[^patterns]。Lydia Hallie と Addy Osmani が作り、書いている。同じ内容は書籍『Learning Patterns』としても無料で読める[^about]。

## 内容

サイトは、素の JavaScript と Node.js、React と Next.js、Vue.js の3つに分かれている[^patterns]。

### JavaScript のパターン

Singleton、Proxy、Prototype、Observer、Module、Mixin、Mediator、Flyweight、Factory の各パターンを、Web アプリでの使い方とともに解説している[^patterns]。

### 性能のパターン

読み込みの順序の最適化、静的と動的な import、表示や操作を待って読み込む import、ルートごとのコード分割を扱う。PRPL パターン、Tree Shaking、Preload と Prefetch、サードパーティの読み込み、リストの仮想化、JavaScript の圧縮も扱う。View Transitions API を使ったページ遷移のアニメーションの解説もある[^patterns]。

### Vue のパターン

コンポーネント、非同期のコンポーネント、Composables、Container と Presentational の分離、Provide と Inject、Renderless のコンポーネント、状態の管理などを扱う[^patterns]。

[^patterns]: 「[Patterns.dev](https://www.patterns.dev/)」。

[^about]: 「[About us](https://www.patterns.dev/about)」Patterns.dev。
