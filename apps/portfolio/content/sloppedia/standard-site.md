---
title: "Standard.site"
description: "AT Protocol で長文の記事を公開するための、プラットフォームをまたいだ共通の lexicon。"
tags: ["AT Protocol", "ブログ", "Web の標準"]
published: true
infobox:
  - label: "種類"
    value: "AT Protocol の lexicon の集まり"
  - label: "名前空間"
    value: "site.standard"
  - label: "始まり"
    value: "2025年末に協業を始め、2026年初めに公開"
  - label: "最初の実装"
    value: "Leaflet、pckt、Offprint"
  - label: "公式サイト"
    value: "standard.site"
    href: "https://standard.site/"
---

Standard.site は、AT Protocol で長文の記事を公開するための共通の lexicon である。lexicon は AT Protocol でレコードの形を決めるスキーマを指す。Standard.site の目的は、別々のプラットフォームで書かれた記事を同じ形で保存して、見つけやすく索引にしやすく持ち運びやすくすることである[^standard-site]。

## 歴史

AT Protocol の上で長文のプラットフォームを作っていた開発者たちの話し合いから始まった[^standard-site]。2025年の末に、Leaflet、pckt.blog、Offprint の3つが共通の lexicon を作ることで合意し、2026年の初めに公開した。Bluesky の社員は、公開されるまでこの計画を知らなかったという[^atproto-blog]。

2026年5月27日には、Bluesky のアプリが Standard.site のレコードを持つリンクを拡張したプレビューで表示するようになった[^atproto-blog]。

## 原則

公式サイトは4つの原則を挙げている。発見の入り口を1つにまとめること（Unified discovery）と、中身を持ち運べるようにすること（Content portability）が目的にあたる。運営については、コミュニティが持つこと（Community ownership）と、統治を最小限にすること（Minimal governance）を掲げる[^standard-site]。

## lexicon

名前空間は site.standard である。次の lexicon がある[^standard-site][^standard-docs]。

| lexicon                          | 表すもの                   |
| -------------------------------- | -------------------------- |
| site.standard.publication        | ブログや雑誌のような刊行物 |
| site.standard.document           | 1本の記事                  |
| site.standard.graph.subscription | 刊行物の購読               |
| site.standard.graph.recommend    | 推薦                       |
| site.standard.theme.basic        | 見た目のテーマ             |

publication で必須なのは名前だけである。URL、アイコン、説明、テーマは任意で持てる[^standard-docs]。

document で必須なのは、属する刊行物、題名、公開日時の3つである。属する刊行物は publication の AT-URI で示すが、刊行物に属さない記事は https の URL でもよい。パス、説明、カバー画像、本文、タグ、寄稿者、更新日時などは任意である[^standard-document]。

本文の形式はプラットフォームごとに任せている。本文の項目は開いた共用体で、各項目が `$type` を持つ。ほかの lexicon で Markdown やブロック形式などに広げられる[^standard-document]。

## 仕組み

記事は、著者の PDS（Personal Data Server）にレコードとして保存される。このため著者は記事の持ち主であり続ける[^standard-docs]。

サイトとレコードの結び付きは2か所で確かめる。刊行物は、そのドメインの `/.well-known/site.standard.publication` で自分の AT-URI を返す。記事は、HTML の head に `<link rel="site.standard.document">` を置いてレコードの AT-URI を示す[^standard-site]。

必須の項目さえ入っていれば、ほかの AT Protocol のプラットフォームがそのレコードを読める[^standard-docs]。

## 対応する道具

公式サイトは、Leaflet、pckt、Offprint を実装済みのプラットフォームに挙げている[^standard-site]。atproto の公式ブログは、ほかに書く側の道具として3つを挙げた。投稿ごとにレコードを出す WordPress のプラグインと、初めから組み込んだ EmDash CMS と、CLI の Sequoia である。読む側では、インデクサの pub-search.waow.tech と potatonet.app と docs.surf がある。クライアントでは Heron が対応し、公開を控えた Anisota も対応する[^atproto-blog]。

Sequoia は Steve Dylan が作った MIT ライセンスの CLI である。auth、init、publish の各コマンドで記事を公開し、inject で検証用の link 要素を HTML に差し込む[^sequoia]。

Standard Reader は、Standard.site の刊行物を読むための Web のリーダーである。RSS のようにフィードを取りに行くのではなく、著者のリポジトリにある署名されたレコードを集めて読む。購読や既読のような読み手の状態も、読み手のリポジトリにレコードとして書き戻す[^standard-reader]。

[^standard-site]: Standard.site「[Standard.site](https://standard.site/)」。2026年11月4日に閲覧。

[^standard-docs]: Standard.site「[Introduction](https://standard.site/docs/introduction/)」。2026年11月4日に閲覧。

[^standard-document]: Standard.site「[Document](https://standard.site/docs/lexicons/document/)」。2026年11月4日に閲覧。

[^atproto-blog]: Jim Ray「[Now in your timeline: Standard.site](https://atproto.com/blog/standard-site-bluesky-timeline)」AT Protocol Blog、2026年5月27日。

[^sequoia]: Steve Dylan「[sequoia](https://tangled.org/apoena.dev/sequoia)」Tangled。版0.4.0。2026年11月4日に閲覧。

[^standard-reader]: hipstersmoothie「[standard-reader](https://github.com/hipstersmoothie/standard-reader)」GitHub。2026年11月4日に閲覧。
