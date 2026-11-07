---
title: "Automerge"
description: "JSON に似た文書を CRDT で扱い、別々の端末での編集を自動でマージするライブラリ。Ink & Switch が中心になって作り、ローカルファーストのソフトウェアの代表的な部品になっている。"
tags:
  ["CRDT", "ローカルファースト", "共同編集", "オープンソースソフトウェア", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Ink & Switch と貢献者"
  - label: "作者"
    value: "Martin Kleppmann、Orion Henry、Peter van Hardenberg、Roshan Choxi、Adam Wiggins"
  - label: "公開"
    value: "2017年"
  - label: "最新のリリース"
    value: "JavaScript 3.5.0、Rust 0.12.0（2026年9月16日）"
  - label: "言語"
    value: "Rust（2.0 から）、JavaScript、WebAssembly"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "automerge.org"
    href: "https://automerge.org/"
---

Automerge は、JSON に似た文書を [CRDT](/sloppedia/crdt) で扱い、別々の端末での編集を自動でマージするライブラリである[^wikipedia]。中央のサーバーがなくても、文書の写しを各端末で同時に編集し、あとで食い違いなく1つにまとめられる[^wikipedia]。開発チームは自らを、ローカルファーストのアプリのためのデータ同期エンジンと呼んでいる[^v3]。

文書の変更をすべて履歴として持ち、変更の履歴はハッシュで互いを指すグラフになっている[^automerge-sep]。2.0 で中核を Rust で書き直し、2025年7月の 3.0 でメモリの使用量を10分の1以下にした[^v2][^v3]。2026年は、誰が書いたかの記録、アクセス制御と暗号化の Keyhive、新しい同期の仕組み Subduction の3つに力を入れている[^automerge-sep]。

## 歴史

2017年に Martin Kleppmann、Orion Henry、Peter van Hardenberg、Roshan Choxi、Adam Wiggins が作り始めた。著作権は研究所の Ink & Switch とケンブリッジ大学が持っていた[^wikipedia]。Kleppmann と Alastair Beresford が2016年に発表した JSON の CRDT の研究をもとにしている[^json-crdt]。

2019年の論文「Local-first software」は、データを利用者の手元に置きながら共同編集もできるソフトウェアを提案し、その実現手段の1つとして Automerge を論じた[^local-first]。

主なリリースは次のとおりである。日付は npm への公開日である[^npm]。

| リリース           | 時期       | 中身                                                                     |
| ------------------ | ---------- | ------------------------------------------------------------------------ |
| 2.0                | 2022年11月 | 中核を Rust で書き直した。JavaScript からは WebAssembly で呼ぶ[^v2]      |
| automerge-repo 1.0 | 2023年9月  | 通信と保存の部品をまとめたライブラリ[^repo]                              |
| 2.2                | 2024年4月  | 書式つきの文章を扱えるようにし、ProseMirror との連携を出した[^rich-text] |
| automerge-repo 2.0 | 2025年5月  | 文書の履歴を調べる機能を足し、API を整理した[^repo2]                     |
| 3.0                | 2025年7月  | 実行中のメモリを10分の1以下にした[^v3]                                   |
| 3.5.0              | 2026年9月  | 変更に作者を記録できるようにした[^release-3-5]                           |

## 仕組み

利用者は普通の JavaScript のオブジェクトを書き換え、Automerge が変更を記録して保存と通信を受け持つ[^v3]。文書には入れ子の連想配列と配列、共同編集できる文字列、数のカウンターを入れられる[^wikipedia]。同期の手順は通信の手段を選ばないので、端末どうしで直接つないでも、サーバーを挟んでも、ファイルで渡してもよい[^wikipedia]。

履歴は、圧縮した列指向の形式で保存する[^wikipedia]。同時の変更を検出して見せられるので、履歴を見返したり、[Git](/sloppedia/git) のように分岐とマージをしたりする道具も作れる[^v3]。代わりに、打った文字の1つ1つに一意の識別子を振るほどの量のメタデータを抱える。開発チームは、技術的な仕事の大半がこの大きな履歴を扱えるようにすることだと説明している[^v3]。

## 3.0 のメモリ削減

2.x までは、保存するときだけ圧縮した形式を使い、編集のために読み込むと履歴を展開していた。3.0 は実行中も圧縮したまま扱うように作り直した[^v3]。

公式の例では、小説『白鯨』を貼り付けた文書のメモリが、2.x の 700MB から 3.0 では 1.3MB になった[^v3]。17時間かけても読み込めなかった文書が9秒で開いた例もあるという[^v3]。ファイルの形式は 2.x と同じで、API もほぼ後方互換である[^v3]。

3.0 では文字列の API も整理した。共同編集できる文字列を既定にし、古い `Text` クラスを消して、`RawString` を `ImmutableString` と改名した[^v3]。

## 2026年の動き

開発チームは2026年7月から、四半期ごとのコミュニティの通話の合間に、月ごとの報告をブログに出している[^automerge-jul]。

### 保存の層の書き直し

7月には、保存の層を担う列指向のエンジン Hexane の v1 が入った。読み書きの速さは測り方によって約2倍から9倍になった[^automerge-jul]。8月の Rust の 0.11.0 では、Hexane の型を Automerge の公開 API から外した[^automerge-aug]。9月の報告では、文章の書式の読み出しが 9.05ms から 1.6µs になる改善が予告された[^automerge-sep]。

### 作者の記録

3.5.0 で、変更に「作者」を記録できるようになった[^release-3-5]。これまでの Automerge は、編集の場ごとに乱数で振る「actor」だけを持っていた。actor からは2つの変更が同じ場から来たことは分かっても、同じ人かどうかは分からない。作者には利用者のアカウントや Keyhive の身元を入れられる[^automerge-sep]。

チームは次に、作者の記録の上に署名を足すとしている。誰が書いたかが分かれば、権限を取り消した人の変更を受け付けないようにできる。CRDT では長く難しかった課題である[^automerge-jul][^automerge-sep]。

### Keyhive と Subduction

Keyhive は、Automerge などの CRDT へアクセス制御と端から端までの暗号化を足す層である[^automerge-sep]。グループの鍵を中央のサーバーなしで合意する方式 BeeKEM の論文は、2026年に Cryptology ePrint Archive で公開された[^automerge-jul]。9月には、守る相手と守らないものを書いた脅威モデルを公開した[^automerge-sep]。automerge-repo に組み込むパッケージ `@automerge/automerge-repo-keyhive` も alpha として出ている[^automerge-aug]。

Subduction は、暗号化したままのデータを中央のサーバーなしに同期する仕組みである[^subduction]。README は、まだ API が不安定な早期の公開だと断っている[^subduction]。7月の報告では、数千の文書を一度に開く研究用のアプリ Patchwork の要求に合わせ、同期サーバーの保存先を redb に替えた[^automerge-jul]。Cloudflare の Durable Objects で動かす取り組みにも触れている[^automerge-jul]。

2026年11月6日には automerge-repo の 3.0.0-alpha.1 が出た[^npm]。前日の11月5日には、Subduction を使う automerge-repo 向けの保存と通信の部品が 3.0.0-alpha.0 として npm に出ている[^npm-subduction]。一方で npm の `latest` の札は、8月に出た 2.6.0-alpha.3 を指したままである[^npm]。

## 使われている所

Ink & Switch の Backstitch は、ゲームエンジン Godot のプロジェクトを Automerge で同期し、分岐やマージを可能にする[^automerge-jul]。同じ Ink & Switch の Livelymerge は、プログラミング環境のヒープそのものを Automerge の文書にしている[^automerge-aug]。Posit の Quarto 2 は、共同編集のエディタを Automerge で作っている[^wikipedia]。

LLM のエージェント向けの課題管理 Braid は、課題を1つの Automerge の文書に入れ、複数の機械やブランチで動くエージェントが同時に課題を書き換えられるようにしている[^automerge-jul]。

## Yjs との違い

同じく CRDT で共同編集を作るライブラリに [Yjs](/sloppedia/yjs) がある。Wikipedia の CRDT の記事は、Yjs が木ではなく平たいリストを使う先駆けだったと書き、Automerge を対比に挙げている[^wikipedia-crdt]。Automerge は全履歴を持ってバージョン管理のように扱うことに重心があり、Yjs は既存のエディタとつなぐ部品の多さと速さを前に出している[^v3][^yjs-readme]。

[^wikipedia]: 「[Automerge](https://en.wikipedia.org/wiki/Automerge)」Wikipedia。2026年11月7日に閲覧。

[^wikipedia-crdt]: 「[Conflict-free replicated data type](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)」Wikipedia。2026年11月7日に閲覧。

[^json-crdt]: Martin Kleppmann、Alastair R. Beresford「[A Conflict-Free Replicated JSON Datatype](https://arxiv.org/abs/1608.03960)」IEEE TPDS、2017年。arXiv での公開は2016年8月。

[^local-first]: Martin Kleppmann ほか「[Local-first software: you own your data, in spite of the cloud](https://www.inkandswitch.com/local-first/)」2019年。

[^v2]: Automerge「[Introducing Automerge 2.0](https://automerge.org/blog/automerge-2/)」。

[^repo]: Automerge「[Automerge Repo: A "batteries-included" toolkit for building local-first applications](https://automerge.org/blog/automerge-repo/)」。

[^rich-text]: Automerge「[Automerge 2.2: Rich Text](https://automerge.org/blog/rich-text/)」。

[^repo2]: Automerge「[Automerge Repo 2.0](https://automerge.org/blog/automerge-repo-2/)」。

[^v3]: Automerge「[Automerge 3.0](https://automerge.org/blog/automerge-3/)」2025年7月。

[^release-3-5]: Automerge「[Releases](https://github.com/automerge/automerge/releases)」GitHub。js/automerge-3.5.0、2026年9月16日。

[^automerge-jul]: Automerge「[This Month in Automerge: July '26](https://automerge.org/blog/2026-july/)」2026年7月。

[^automerge-aug]: Automerge「[This Month in Automerge: August '26](https://automerge.org/blog/2026-august/)」2026年8月。

[^automerge-sep]: Automerge「[This Month in Automerge: September '26](https://automerge.org/blog/2026-september/)」2026年9月。

[^subduction]: Ink & Switch「[Subduction](https://github.com/inkandswitch/subduction)」GitHub。2026年11月7日に閲覧。

[^npm]: npm「[@automerge/automerge](https://www.npmjs.com/package/@automerge/automerge)」「[@automerge/automerge-repo](https://www.npmjs.com/package/@automerge/automerge-repo)」。2026年11月7日に閲覧。

[^npm-subduction]: npm「[@automerge/automerge-repo-subduction-network-websocket](https://www.npmjs.com/package/@automerge/automerge-repo-subduction-network-websocket)」「[@automerge/automerge-repo-subduction-storage-indexeddb](https://www.npmjs.com/package/@automerge/automerge-repo-subduction-storage-indexeddb)」。2026年11月7日に閲覧。

[^yjs-readme]: Yjs「[README](https://github.com/yjs/yjs)」GitHub。2026年11月7日に閲覧。
