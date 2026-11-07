---
title: "Yjs"
description: "共同編集のための CRDT のライブラリ。Map や Array に似た「共有型」を書き換えると、変更がほかの参加者へ届いて衝突なくマージされる。多くのエディタや製品が使っている。"
tags:
  ["CRDT", "共同編集", "ローカルファースト", "オープンソースソフトウェア", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Kevin Jahns"
  - label: "npm への初公開"
    value: "2015年1月"
  - label: "アルゴリズム"
    value: "YATA を改良したもの"
  - label: "安定したリリース"
    value: "13.6.33（2026年9月23日）"
  - label: "次のリリース"
    value: "14.0.0-rc.29（2026年10月15日、npm の @y/y）"
  - label: "言語"
    value: "JavaScript（Rust の移植は Yrs）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "yjs.dev"
    href: "https://yjs.dev/"
---

Yjs は、共同編集のための [CRDT](/sloppedia/crdt) のライブラリである。内部のデータ構造を「共有型」として見せ、Map や Array に似た型を書き換えると、変更がほかの参加者へ届いて衝突なくマージされる[^readme]。通信の手段を選ばず、端末どうしで直接つなぐこともできる。書式つきの文章のエディタとの連携、オフラインの編集、スナップショット、取り消し、他人のカーソルの表示を備える[^readme]。

作者は Kevin Jahns である。アーヘン工科大学（RWTH）の学生だったころの研究がもとになっている[^readme]。JupyterLab、Nextcloud、Proton Docs、Gitbook、Evernote などが使っている[^readme]。2026年11月7日の時点の安定したリリースは 13.6.33 である。次の 14 は、npm のパッケージ名を `@y/y` に替えてリリース候補を重ねている[^npm-yjs][^npm-y]。

## 歴史

npm の `yjs` への最初の公開は2015年1月である[^npm-yjs]。2016年に、Petru Nicolaescu、Kevin Jahns、Michael Derntl、Ralf Klamma が、Yjs が使う CRDT の YATA を論文で発表した[^yata]。13.0.0 は2020年1月に出て、2023年4月の 13.6.0 から2026年まで 13.6 系の修正が続いている[^npm-yjs]。

## 仕組み

Yjs は YATA に手を加えたアルゴリズムを実装している[^readme]。挿入した要素はそれぞれ、参加者の番号と、その参加者の中で増えていく時計の組を識別子に持つ。各参加者の次の時計の値を並べた「状態ベクトル」を比べれば、相手に足りない差分だけを送れる[^readme]。

文章向けの CRDT は、消した要素も墓標として残すので大きくなり続ける。Yjs は次の工夫でこの欠点を和らげている[^readme]。

- 続けて打った文字を1つの構造にまとめ、メタデータを減らす
- 消した構造からは中身を捨て、存在した印だけを残す
- 親ごと消えた要素は、並び順を気にする必要がないので掃除する

README は、利用者がふつう文字を順に打つので、実際の性能はベンチマークよりよくなると説明している[^readme]。作者が管理するベンチマークは、Yjs と Automerge などを比べている[^readme]。

lean-yjs は、YATA の正しさを証明支援系 Lean で証明するプロジェクトである。アルゴリズムの正しさを確かめる一方で、元の YATA の論文の擬似コードに誤りがあることも見つけた[^readme]。

## 周りの部品

Yjs の本体は通信と保存の機能を持たず、周りの部品と組み合わせて使う[^readme]。

| 種類     | 例                                                                 |
| -------- | ------------------------------------------------------------------ |
| エディタ | ProseMirror、Tiptap、BlockNote、Lexical、Quill、CodeMirror、Monaco |
| 通信     | y-websocket、y-webrtc、Hocuspocus、y-sweet、y-redis                |
| 保存     | y-indexeddb                                                        |
| 移植     | Yrs（Rust）、y-octo（Rust）、go-yjs など                           |

Rust の移植の Yrs は y-crdt というプロジェクトにあり、ほかの言語向けの結びつけはこれを使って作られている[^readme]。AppFlowy や Multi.app は Yrs を使っている[^readme]。crates.io の `yrs` は2026年11月4日に 0.28.1 が出た[^crates-yrs]。

## 資金

Yjs は MIT License で誰でも使える。ただし README は、商用のアプリに使うなら金銭で支援することが「社会的に期待される」と書いている[^readme]。作者は GitHub Sponsors で寄付や支援の契約を受け、契約した利用者とは定期的にビデオ通話で相談に乗る[^readme]。README の最後には、今は空いた時間に Yjs を開発していると書かれている[^readme]。

## Yjs 14

次の大きなリリースの 14 は、パッケージ名を `yjs` から `@y/y` に替えて進んでいる。`yjs` の名前での 14 の公開は2025年12月の 14.0.0-16 が最後で、`@y/y` が同じ月に作られた[^npm-yjs][^npm-y]。GitHub の main ブランチの `package.json` も `@y/y` の 14.0.0-rc.29 になっている[^package-json]。リリース候補は2026年7月から10月まで重ねられ、10月15日に rc.29 が出た[^npm-y]。ProseMirror との連携も、`@y/prosemirror` の 2.0.0 のベータとして並行して進んでいる[^npm-y-prosemirror]。

14 の中心は、変更のまとまりと、誰が書いたかの記録である。2026年2月の FOSDEM では、BlockNote の開発者が、誰がいつ何を書いたかを見られる履歴と、変更の提案の機能を紹介した[^fosdem]。この仕事は、ドイツの ZenDiS と、フランスの省庁間デジタル局（DINUM）の資金を受け、Kevin Jahns と組んで進めている[^fosdem]。main の README では、`Y.Text` が lib0 の delta を受け渡しし、書いた人の情報を付けて描くための引数を持つようになっている[^readme]。

## Automerge との違い

同じく CRDT で共同編集を作るライブラリに [Automerge](/sloppedia/automerge) がある。Wikipedia の CRDT の記事は、Yjs を、木ではなく平たいリストを使う先駆けとして挙げている[^wikipedia-crdt]。Yjs は既存のエディタにつなぐ部品の多さを前に出し、Automerge は全履歴を持ってバージョン管理のように扱うことに重心を置いている[^readme][^automerge-3]。2026年には、両者とも誰が書いたかを記録する機能を入れる方向に進んでいる[^fosdem][^automerge-sep]。

[^readme]: Yjs「[README](https://github.com/yjs/yjs)」GitHub。2026年11月7日に閲覧。

[^yata]: Petru Nicolaescu ほか「[Near Real-Time Peer-to-Peer Shared Editing on Extensible Data Types](https://www.researchgate.net/publication/310212186_Near_Real-Time_Peer-to-Peer_Shared_Editing_on_Extensible_Data_Types)」GROUP 2016、2016年。

[^npm-yjs]: npm「[yjs](https://www.npmjs.com/package/yjs)」。2026年11月7日に閲覧。

[^npm-y]: npm「[@y/y](https://www.npmjs.com/package/@y/y)」。2026年11月7日に閲覧。

[^npm-y-prosemirror]: npm「[@y/prosemirror](https://www.npmjs.com/package/@y/prosemirror)」。2026年11月7日に閲覧。

[^package-json]: Yjs「[package.json](https://github.com/yjs/yjs/blob/main/package.json)」GitHub。2026年11月7日に閲覧。

[^crates-yrs]: crates.io「[yrs](https://crates.io/crates/yrs)」。2026年11月7日に閲覧。

[^fosdem]: Yousef El-Dardiry、Nick Perez「[BlockNote, Prosemirror and Yjs 14: Versioning and Track Changes](https://archive.fosdem.org/2026/schedule/event/8VKQXR-blocknote-yjs-prosemirror/)」FOSDEM 2026、2026年2月1日。

[^wikipedia-crdt]: 「[Conflict-free replicated data type](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)」Wikipedia。2026年11月7日に閲覧。

[^automerge-3]: Automerge「[Automerge 3.0](https://automerge.org/blog/automerge-3/)」2025年7月。

[^automerge-sep]: Automerge「[This Month in Automerge: September '26](https://automerge.org/blog/2026-september/)」2026年9月。
