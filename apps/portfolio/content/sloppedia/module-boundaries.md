---
title: "モジュール境界"
description: "ソフトウェア設計における、モジュールの内部とそれを利用するためのコードとの境界に関する概念である。1972年の David Parnas による情報隠蔽にまで遡り、2026年には AI コーディングエージェントのガードレールとしても議論されている。"
tags: ["ソフトウェア設計", "ソフトウェア開発"]
published: true
infobox:
  - label: "源流"
    value: "Parnas の情報隠蔽（1972年）"
  - label: "関連する法則"
    value: "コンウェイの法則、ハイラムの法則"
  - label: "検査の道具"
    value: "モジュール境界ツール"
---

モジュール境界とは、モジュールの内部とそれを利用するためのコードとの間の線のことである。境界外のコードは、モジュールが公開するもののみを利用できる。一方、モジュールは、依存が許可されているモジュールにのみ依存できる。

境界は2つの約束を守る。1つ目はカプセル化であり、これにより外側を壊すことなく内部を変更できる。2つ目は方向であり、これにより依存関係が許可された方向においてのみ境界を越えることができる。

## 起源

1972年12月、David Parnas は論文「On the Criteria To Be Used in Decomposing Systems into Modules」を発表した[^parnas]。掲載誌は Communications of the ACM である[^parnas]。この論文では、モジュールはサブプログラムではなく責任割り当てである[^parnas]。KWIC インデックスを構築するプログラムを例に、同じシステムを分割する2つの方法を比較した[^parnas]。

従来の分割は、フローチャートの手順に従っていた。Parnas は代わりに、変更しにくい設計上の決定事項や、変わりやすい設計上の決定事項のリストから始めることを提案した[^parnas]。その後、各モジュールは、そのような決定事項を他のモジュールから隠蔽するように設計される[^parnas]。この考え方は後に情報隠蔽として知られるようになった。

同論文では、クリーンな分解と、モジュールが下位レベルのモジュールのみを使用する階層構造を区別している[^parnas]。Parnas は、これら2つの特性はいずれも望ましいが、独立していると結論付けた[^parnas]。現在の境界ツールは、これら両方を検証する。パブリック API は隠蔽に対応し、許可された方向は階層構造に対応している。

1968年、Melvin Conway は、システムを設計する組織は、自らのコミュニケーション構造を写した設計を作ると記した[^conway]。これは後にコンウェイの法則として知られるようになった。コードにおける境界は、それを記述するチーム間の境界に従う傾向がある。

## 公開と公表

Martin Fowler は、公開（public）インターフェースと公表済み（published）インターフェースを区別している[^published]。公表済みインターフェースは、定義されているコードベース外のコードによって使用される[^published]。未公表インターフェースは呼び出し元とともに変更できるが、公表済みインターフェースは変更できない[^published]。Fowler は、この区別は公開と非公開の区別よりも重要であると主張している[^published]。

TypeScript では、`export` によってプログラム内のすべてのファイルに名前が公開される。この言語には、名前がフォルダ内でしか見えないことを示す手段がない。境界ツールがこの隙間を埋める。[ハイラムの法則](/sloppedia/hyrums-law)によれば、インターフェースの観測可能な挙動はすべて、誰かによって依存されることになる。境界は、そもそも何が観測可能かを制限するのである。

## 境界付きコンテキストとモジュール式モノリス

ドメイン駆動設計では、大規模なシステムが境界付きコンテキストに分割され、それぞれが独自の統一モデルを持つ[^bounded]。Fowler は、境界は通常、人々が使用する言語の違いに沿って引かれると指摘している[^bounded]。

モジュール式モノリスとは、単一のユニットとして展開されるものの、境界が定められたモジュールに分割されたシステムである。2019年、Kamil Grzybek は、各モジュールはビジネスに整合させ、依存関係を少なく、かつ弱くすべきであると記した[^grzybek]。また、各モジュールには定義された契約が必要であるとも記している[^grzybek]。Simon Brown は、すべての型が公開型である場合、パッケージは単にファイルを整理するための手段にしかならないと主張している[^brown]。

2019年2月、Shopify は Rails のモノリスをコンポーネントへと再編成する経緯を説明した[^shopify-2019]。これらのコンポーネントは、技術的なレイヤーではなく、注文、配送、請求といったビジネスコンセプトに基づいている[^shopify-2019]。Wedge と呼ばれる社内ツールは、コンポーネントのパブリック API を介さない呼び出しを検出した[^shopify-2019]。その後、Shopify は Rails アプリケーションにおけるパッケージ間の境界をチェックする Packwerk を公開した[^packwerk]。

## ルールの種類

境界ツールがチェックするルールには、いくつかの種類がある。

| ルール         | 禁止事項                                                   | ツールの例                                                                            |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| パブリック API | モジュールのエントリポイント以外のファイルをインポートする | [Sheriff](/sloppedia/sheriff)、[Steiger](/sloppedia/steiger)                          |
| レイヤー       | 上位レイヤーからインポートする                             | [Steiger](/sloppedia/steiger)、[dependency-cruiser](/sloppedia/dependency-cruiser)    |
| タグ           | 許可されていないタグを持つモジュールに依存する             | [Nx](/sloppedia/nx)、[Sheriff](/sloppedia/sheriff)、[Turborepo](/sloppedia/turborepo) |
| 兄弟           | 同じレイヤー上の別のスライスをインポートする               | [Steiger](/sloppedia/steiger)                                                         |
| 循環           | 循環依存関係                                               | [dependency-cruiser](/sloppedia/dependency-cruiser)、[Madge](/sloppedia/madge)        |
| 宣言           | 依存関係として宣言されていないパッケージをインポートする   | [Turborepo](/sloppedia/turborepo)                                                     |

## 言語およびビルドシステムにおける境界

言語やビルドシステムの中には、それ自体で境界を引くものがある。

Go 1.4 では内部パッケージが導入された[^go]。`internal` という名前のディレクトリ配下のパッケージは、そのディレクトリの親をルートとするツリーからのみインポートできる[^go]。このルールは 1.4 ではメインの Go リポジトリに、1.5 からはすべてのリポジトリに適用された[^go]。

Node.js では、`package.json` に `exports` フィールドがある場合、リストにないサブパスはインポートできない[^node]。このようなインポートは `ERR_PACKAGE_PATH_NOT_EXPORTED` で失敗する[^node]。ドキュメントによれば、ファイルを絶対パスで読み込めるので、厳密なカプセル化にならない[^node]。

[Bazel](/sloppedia/bazel) では、すべてのターゲットに `visibility` 属性がある[^bazel]。デフォルトが設定されていない限り、ターゲットは自身のパッケージにのみ可視となる[^bazel]。

TypeScript のモノレポでは、`exports` を持つワークスペースパッケージはパッケージレベルで境界を持つ。パッケージ内では言語による境界はないため、リントツールが境界を引く。これらのツールは「[モジュール境界ツール](/sloppedia/module-boundary-tools)」で比較している。

## AI コーディングエージェント

2026年には、AI コーディングエージェントのガードレールとして境界についても議論されている。2026年11月10日、Shopify は Shopify アプリを12週間で再構築した経緯を説明した[^shopify-app]。記事によれば、エージェントと働くならアーキテクチャを人間の頭の中だけに置かず、実行可能な形にしなければならない[^shopify-app]。ルールはリントや CI のチェック項目に盛り込まれ、ルールが遵守されたかどうかは CI が判断するとしている[^shopify-app]。

Shopify が11月5日に公開した Reflex アーキテクチャでは、アプリを Core と Mobile に分割している[^reflex]。Core には UI のインポートがなく、Mobile は Core に依存している[^reflex]。Core が Mobile をインポートすることはない[^reflex]。

## 持ち主の視点

Sloppedia の持ち主の masseater は、いかなるマシンでもチェックされない境界は実際には存在しないと考えている。masseater.dev は [Steiger](/sloppedia/steiger) を用いて [Feature-Sliced Design](/sloppedia/feature-sliced-design) をチェックしている。上位レイヤーからのインポートや、同一レイヤー内のスライス間のインポートはエラーとなる。2026年11月、masseater は UI の無いコードも同様にモジュールに分割する標準規格を求めた。

## 関連項目

- [モジュール境界ツール](/sloppedia/module-boundary-tools)
- [Feature-Sliced Design](/sloppedia/feature-sliced-design)
- [ハイラムの法則](/sloppedia/hyrums-law)
- [モノレポとポリレポ](/sloppedia/monorepo-and-polyrepo)

[^parnas]: D. L. Parnas「[On the Criteria To Be Used in Decomposing Systems into Modules](https://dl.acm.org/doi/10.1145/361598.361623)」Communications of the ACM 15巻12号、1972年12月。

[^conway]: Melvin E. Conway「[How Do Committees Invent?](https://www.melconway.com/Home/Committees_Paper.html)」Datamation、1968年4月。2026年11月15日に閲覧。

[^published]: Martin Fowler「[PublishedInterface](https://martinfowler.com/bliki/PublishedInterface.html)」martinfowler.com、2003年12月26日。

[^bounded]: Martin Fowler「[BoundedContext](https://martinfowler.com/bliki/BoundedContext.html)」martinfowler.com、2014年1月15日。

[^grzybek]: Kamil Grzybek「[Modular Monolith: A Primer](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer)」、2019年12月2日。

[^brown]: Simon Brown「[Modular monolith and "package by component"](https://simonbrown.je/modular-monolith)」。2026年11月15日に閲覧。

[^shopify-2019]: Kirsten Westeinde「[Deconstructing the Monolith](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)」Shopify Engineering、2019年2月21日。

[^packwerk]: Shopify「[Shopify/packwerk](https://github.com/Shopify/packwerk)」GitHub。2026年11月15日に閲覧。

[^go]: The Go Authors「[Go 1.4 Release Notes](https://go.dev/doc/go1.4#internalpackages)」。2026年11月15日に閲覧。

[^node]: Node.js「[Modules: Packages](https://nodejs.org/api/packages.html#package-entry-points)」。2026年11月15日に閲覧。

[^bazel]: Bazel「[Visibility](https://bazel.build/concepts/visibility)」。2026年11月15日に閲覧。

[^shopify-app]: Remi Vanhee「[How we rebuilt the Shopify app in 12 weeks](https://shopify.engineering/shopify-app-rebuild)」Shopify Engineering、2026年11月10日。

[^reflex]: Thiago Magalhaes「[Reflex: an architecture for building mobile apps with agents](https://shopify.engineering/reflex)」Shopify Engineering、2026年11月5日。
