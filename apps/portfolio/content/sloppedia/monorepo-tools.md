---
title: "monorepo.tools"
description: "Nx が運営する、モノレポの考え方とモノレポの道具の比較をまとめたウェブサイト。比較表には運営元の Nx も並んでいる。"
tags: ["モノレポ", "ウェブサイト", "Nx", "2026年のソフトウェア"]
published: true
infobox:
  - label: "運営"
    value: "Nx"
  - label: "最初のコミット"
    value: "2021年12月13日"
  - label: "比較する道具"
    value: "9つ"
  - label: "比較の項目"
    value: "20行"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "monorepo.tools"
    href: "https://monorepo.tools/"
---

monorepo.tools は、[モノレポ](/sloppedia/monorepo-and-polyrepo)とは何か、なぜ使うのか、どの道具があるのかをまとめたウェブサイトである[^home]。モノレポの道具を作る [Nx](/sloppedia/nx) が運営している。ページの末尾には「Made with love by Nx」とある[^home]。

サイトのソースは GitHub の nrwl/monorepo.tools で公開されている[^repo]。最初のコミットは2021年12月13日である[^first-commit]。

## 内容

### モノレポの定義

サイトは、モノレポを「明確な関係を持つ複数の別々のプロジェクトを含む、1つのリポジトリ」と定義している[^home]。Nx は、これが最も一貫した正確な言い方だと考えていると添えている[^home]。

コードを1か所に集めただけのものは、この定義に入らない。サイトは「モノレポはモノリスではない」と強調し、よいモノレポはモノリスの反対だと述べる[^home]。この主張は、Nx のブログ記事「A Monorepo Is NOT a Monolith」につながっている[^not-monolith]。

### ポリレポの税

「The Polyrepo Tax」の節は、リポジトリを分けることの代償を並べる[^home]。分ければ各チームの自主性は得られるが、その代償は積み重なると述べる。コードの共有、重複、リポジトリをまたぐ変更、規約の徹底の4点で、ポリレポとモノレポを比べている[^home]。

### AI のエージェント

2026年の時点のサイトは、モノレポを AI のエージェントと結びつけて紹介している。導入の文は、AI のエージェントが開発の仕方を変えるなかで、モノレポの重要性が改めて高まっていると書く[^home]。「Monorepos Amplify AI Agents」の節は、エージェントにとっての利点を4つ挙げる[^home]。

- リポジトリの全体が見えること
- 文脈が自由に行き来すること
- プロジェクトをまたぐ作業ができること
- 結果がすぐに返ること

ナビゲーションには、AI とモノレポを扱う別のページもある[^home]。

### 合成モノレポ

「Synthetic Monorepos」の節は、既存の複数のリポジトリを、コードを動かさずに1つの依存のグラフにつなぐ考え方を紹介している[^home]。

### 最良の道具に求めるもの

「What a Best-in-Class Tool Provides」の節は、道具に求める機能を6つ挙げる[^home]。

| 機能                   | 意味                                   |
| ---------------------- | -------------------------------------- |
| ローカルのキャッシュ   | 同じ入力のタスクの結果を手元で使い回す |
| リモートのキャッシュ   | その結果を機械やCIの間で共有する       |
| 分散したタスクの実行   | 複数の機械にタスクを配って動かす       |
| 影響の検出             | 変更が影響するプロジェクトだけを選ぶ   |
| タスクの分割           | 大きなタスクを小さく分けて並べる       |
| 不安定なテストへの対処 | 結果が揺れるタスクを見分けて動かし直す |

節の最後は「Nx はこれらをすべて満たす」と締めくくっている[^home]。

## 道具の比較

比較のページは、9つの道具を20の項目で比べている[^compare]。並びは次のとおりである。

| 道具                              | 作り手            |
| --------------------------------- | ----------------- |
| [Bazel](/sloppedia/bazel)         | Google            |
| [Gradle](/sloppedia/gradle)       | Gradle, Inc       |
| [Lage](/sloppedia/lage)           | Microsoft         |
| [Lerna](/sloppedia/lerna)         | Nx のチームが保守 |
| [moon](/sloppedia/moon)           | moonrepo          |
| [Nx](/sloppedia/nx)               | Nx                |
| [Pants](/sloppedia/pants)         | Pants Build       |
| [Rush](/sloppedia/rush)           | Microsoft         |
| [Turborepo](/sloppedia/turborepo) | Vercel            |

項目は4つの分類に分かれている[^compare]。

| 分類           | 項目                                                                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 速さ           | ローカルの計算のキャッシュ、ローカルのタスクの調整、計算の分散キャッシュ、タスクの分散実行、透過的なリモート実行、影響を受けるプロジェクトの検出、タスクの分割、不安定なテストへの対処 |
| わかりやすさ   | ワークスペースの分析、プロジェクトのグラフの可視化                                                                                                                                     |
| 管理のしやすさ | ソースコードの共有、多言語への対応、コードの生成、プロジェクトの制約と可視性、密閉されたビルド                                                                                         |
| AI への対応    | MCP のサーバー、AI のスキル、ワークスペースの分析、AI によるタスクの実行、エージェントによる CI                                                                                        |

各欄の評価は、「標準で対応」「対応しない」「自分で実装する」「コミュニティが提供」の4つである[^compare]。密閉されたビルドの項目は、2026年7月29日のコミットで足された[^hermetic-commit]。AI への対応の分類も、2026年の時点では表に入っている[^compare]。

### 中立性

比較のページは、各道具をできるだけ客観的に表すよう努めており、誤りがあればプルリクエストを歓迎すると述べている[^compare]。一方で、運営元の Nx が表の中の1つの道具でもある。Nx は「標準で対応」の欄が最も多い道具として表に載っている[^compare]。比較のページの中には、運営元との関係を断る文が無い[^compare]。

リポジトリの README は、比べる道具を Bazel、Lage、Lerna、moon、Nx、Rush、Turborepo の7つとしている[^repo]。選んだ理由は、ウェブ開発のコミュニティでの利用や知名度だと書いている[^repo]。公開中のサイトには、これに Gradle と Pants が加わっている[^compare]。

Rush と Lage の可視化の欄には、どちらも「可視化の道具は付いてこないが、自分で書ける」と書かれている[^compare]。ところが Lage の公式の文書は、プロファイラーでビルドのグラフを可視化できると案内している[^lage]。比較表と各道具の文書の食い違いの例である。

## 2026年の動き

2026年のコミットは、Nx の催しの告知と比較表の手入れが中心である[^repo-commits]。

| 日付    | 変更                                    |
| ------- | --------------------------------------- |
| 6月     | Nx の 2026年の会議のページを足した      |
| 7月10日 | LICENSE の年を2026年に更新した          |
| 7月29日 | 密閉されたビルドの比較の項目を足した    |
| 8月3日  | 会議の講演の動画へのリンクを足した      |
| 10月1日 | Nx の製品の催しの告知を全ページに出した |
| 10月8日 | 会議の Nx のロゴを直した                |

ページの末尾には、姉妹のサイトとして metaharness.tools へのリンクがある[^home]。

## 評価

Sloppedia の持ち主の masseater がモノレポの構造の可視化を調べたとき、Sloppedia はこの比較表を参照した。その記事でも、運営元の Nx が備える側に入っている点は割り引いて読む必要があると書いた。詳しくは「[モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)」を参照。

## 関連項目

- [モノレポとポリレポ](/sloppedia/monorepo-and-polyrepo)
- [モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)
- [Nx](/sloppedia/nx)

[^home]: Nx「[Monorepo Explained](https://monorepo.tools/)」monorepo.tools。2026年11月9日に閲覧。

[^compare]: Nx「[Compare Monorepo Tools](https://monorepo.tools/compare)」monorepo.tools。2026年11月9日に閲覧。

[^repo]: 「[nrwl/monorepo.tools](https://github.com/nrwl/monorepo.tools)」GitHub。2026年11月9日に閲覧。

[^repo-commits]: 「[Commits · nrwl/monorepo.tools](https://github.com/nrwl/monorepo.tools/commits/main/)」GitHub。2026年11月9日に閲覧。

[^first-commit]: ben「[initial commit](https://github.com/nrwl/monorepo.tools/commit/d1cde38)」nrwl/monorepo.tools、2021年12月13日。

[^hermetic-commit]: 「feat: add hermetic builds comparison category (#151)」nrwl/monorepo.tools、2026年7月29日。

[^not-monolith]: Nx「[A Monorepo Is NOT a Monolith](https://nx.dev/blog/monorepo-is-not-monolith)」Nx Blog、2026年2月24日。

[^lage]: Microsoft「[Lage](https://microsoft.github.io/lage/)」。2026年11月9日に閲覧。
