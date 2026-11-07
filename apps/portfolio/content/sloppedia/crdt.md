---
title: "CRDT"
description: "複数の計算機に複製したデータを、互いに調整せずに書き換えても、最後には全員が同じ状態にたどり着くように作ったデータ構造。共同編集やローカルファーストのソフトウェアで使われている。"
tags: ["分散システム", "データ構造", "共同編集", "ローカルファースト", "2026年のソフトウェア"]
published: true
infobox:
  - label: "正式名称"
    value: "Conflict-free Replicated Data Type"
  - label: "定式化"
    value: "2011年"
  - label: "定式化した人"
    value: "Marc Shapiro、Nuno Preguiça、Carlos Baquero、Marek Zawirski"
  - label: "方式"
    value: "状態ベース（CvRDT）、操作ベース（CmRDT）"
  - label: "保証"
    value: "強い結果整合性"
  - label: "主な実装"
    value: "Automerge、Yjs、Loro、Riak"
  - label: "情報源"
    value: "crdt.tech"
    href: "https://crdt.tech/"
---

CRDT は、複数の計算機が持つデータの複製を各自で書き換えても、全員が最後は同じ状態へたどり着くように作ったデータ構造である[^wikipedia]。名前は Conflict-free Replicated Data Type の略である。各複製はほかと相談せずに更新を受け付け、食い違いはデータ型に組み込んだ規則が自動で解消する[^wikipedia]。

2011年に Marc Shapiro らが概念を定式化した[^shapiro2011]。共同で文章を書くエディタや、オフラインでも動くアプリの同期に使われ、2026年の時点では [Automerge](/sloppedia/automerge) と [Yjs](/sloppedia/yjs) が代表的なライブラリになっている。

## 背景

複製したデータを各所で同時に書き換えると、複製どうしの中身が食い違う。分散システムの多くは、ロックや合意の手続きで同時の更新そのものを防ぐ道を選んできた[^wikipedia]。

もう1つの道は、同時の更新をすべて受け付けて、あとでまとめる楽観的な複製である。CRDT はこの道を取り、同じ更新の集まりを受け取った複製は必ず同じ状態になる、という強い結果整合性を保証する[^wikipedia]。

最も簡単な例は、一度立てたら下ろせない真偽値の旗である。どの複製でも「どこかで true になったら true」という規則でまとめれば、更新が届く順番によらず結果がそろう[^wikipedia]。

## 2つの方式

CRDT の作り方は2つに分かれ、理論上は互いに相手を模倣できる[^shapiro2011]。

| 方式                     | 送るもの   | 必要な性質                                                 |
| ------------------------ | ---------- | ---------------------------------------------------------- |
| 状態ベース（CvRDT）      | 状態の全体 | マージが可換・結合的・冪等で、状態が半束をなす             |
| 操作ベース（CmRDT）      | 更新の操作 | 同時の操作が可換で、配送の層が操作を漏れなく一度ずつ届ける |
| デルタ状態（delta-CRDT） | 状態の差分 | 状態ベースと同じ。送る量だけを減らす                       |

状態ベースは作りやすく、届け方を選ばない。代わりに状態の全体をいずれ全員へ送ることになる[^wikipedia]。操作ベースは送る量が少ないが、届け方に強い条件を課す[^wikipedia]。

## よく知られた型

単純な型を組み合わせて、複雑な型を作るのが定石である[^wikipedia]。

| 名前            | 中身                                                               |
| --------------- | ------------------------------------------------------------------ |
| G-Counter       | 増やすだけの数。複製ごとの数を持ち、マージでは各要素の最大値を取る |
| PN-Counter      | 増減できる数。増やした数と減らした数の G-Counter を2つ持つ         |
| G-Set           | 足すだけの集合。マージは和集合である                               |
| 2P-Set          | 消した要素を墓標の集合に入れる。一度消した要素は戻せない           |
| LWW-Element-Set | 時刻の新しい追加と削除を勝たせる集合                               |
| OR-Set          | 追加ごとに一意の札を付け、見えていた札だけを消す集合               |

## 列と共同編集

文章のように順番のある列を扱う CRDT は、共同編集のエディタで[操作変換](https://en.wikipedia.org/wiki/Operational_transformation)（OT）の代わりに使われる[^wikipedia]。OT は中央のサーバーが編集の位置を変換して順番をそろえる。列の CRDT は、文字に一意の識別子を振って並び順を決めるので、中央のサーバーがなくても収束する[^yjs-readme]。

WOOT、Treedoc、RGA、Logoot、LSEQ などが研究から生まれた[^wikipedia]。Yjs が使う YATA は2016年の論文に基づく[^yata]。2023年の Fugue は、2人が同じ場所に同時に打った文字が交互に混ざる現象を抑える[^fugue]。

列の CRDT は、消した文字も墓標として残すので大きくなり続けやすい[^yjs-readme]。2024年に Joseph Gentle と Martin Kleppmann が発表した Eg-walker は、普段は編集の履歴だけを持ち、同時の編集をまとめるときだけ CRDT の状態を一時的に組み立てる[^eg-walker]。論文は、既存の CRDT よりメモリが小さく、OT のようにサーバーを要らないと主張している[^eg-walker]。Loro はこの方式を取り入れた[^loro]。

速さを比べると、研究の実装より、最適化を重ねた業界の実装の方が上回ると知られている[^crdts-go-brrr]。

## 使われている所

Wikipedia は、次のような利用例を挙げている[^wikipedia]。

- Riak のデータ型。ゲーム『League of Legends』のチャットが使っている
- Redis の CRDT を使う機能
- Apple のメモアプリの、端末どうしのオフラインの編集の同期
- Microsoft の Fluid Framework

共同編集とオフラインの動作を両立させるローカルファーストのソフトウェアでは、CRDT が中心の部品になっている。2019年の論文「Local-first software」は、Automerge を例に挙げてこの考え方を広めた[^local-first]。

## 2026年の動き

2026年は、収束を保証するだけでは足りない点が議論の中心になった。Automerge の開発チームは8月、Ink & Switch の研究ノート「Convergence Is Not Enough」を紹介した。全員が同じ状態になっても、その状態がプログラムとして正しいとは限らないという指摘で、チームは「広く合意された一般的な解決策はまだない」と認めている[^automerge-aug]。

悪意のある参加者がいても収束させる研究も進んだ。Martin Kleppmann は9月24日、ローマで開かれた SRDS 2026 の基調講演で、ビザンチン結果整合性を Automerge を例に論じた[^automerge-sep]。誰がどの変更を書いたかを記録し、権限を取り消した人の変更を拒む仕組みは、CRDT にとって長く難しい課題だった。Automerge は2026年9月に作者の記録を入れ、Keyhive で取り消しへ進んでいる[^automerge-jul][^automerge-sep]。Yjs も次の大きなリリースで、誰が書いたかを表示する機能を入れようとしている[^fosdem-yjs14]。

集まりも大きくなった。2026年2月の FOSDEM にはローカルファーストと CRDT の部屋が設けられ[^fosdem-track]、ベルリンで開かれた3回目の Local-First Conf には約400人が集まった[^wiggins]。

[^wikipedia]: 「[Conflict-free replicated data type](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)」Wikipedia。2026年11月7日に閲覧。

[^shapiro2011]: Marc Shapiro ほか「[Conflict-Free Replicated Data Types](https://doi.org/10.1007/978-3-642-24550-3_29)」SSS 2011、2011年。

[^yjs-readme]: Yjs「[README](https://github.com/yjs/yjs)」GitHub。2026年11月7日に閲覧。

[^yata]: Petru Nicolaescu ほか「[Near Real-Time Peer-to-Peer Shared Editing on Extensible Data Types](https://www.researchgate.net/publication/310212186_Near_Real-Time_Peer-to-Peer_Shared_Editing_on_Extensible_Data_Types)」GROUP 2016、2016年。

[^fugue]: Matthew Weidner、Martin Kleppmann「[The Art of the Fugue](https://arxiv.org/abs/2305.00583)」arXiv、2023年。

[^eg-walker]: Joseph Gentle、Martin Kleppmann「[Collaborative Text Editing with Eg-walker: Better, Faster, Smaller](https://arxiv.org/abs/2409.14252)」EuroSys 2025。arXiv での公開は2024年9月。

[^loro]: Loro「[Loro: Reimagine State Management with CRDTs](https://loro.dev/blog/loro-now-open-source)」。2026年11月7日に閲覧。

[^crdts-go-brrr]: Seph Gentle「[Faster CRDTs: An Adventure in Optimization](https://josephg.com/blog/crdts-go-brrr/)」2021年。

[^local-first]: Martin Kleppmann ほか「[Local-first software: you own your data, in spite of the cloud](https://www.inkandswitch.com/local-first/)」2019年。

[^automerge-jul]: Automerge「[This Month in Automerge: July '26](https://automerge.org/blog/2026-july/)」2026年7月。

[^automerge-aug]: Automerge「[This Month in Automerge: August '26](https://automerge.org/blog/2026-august/)」2026年8月。

[^automerge-sep]: Automerge「[This Month in Automerge: September '26](https://automerge.org/blog/2026-september/)」2026年9月。

[^fosdem-yjs14]: Yousef El-Dardiry、Nick Perez「[BlockNote, Prosemirror and Yjs 14: Versioning and Track Changes](https://archive.fosdem.org/2026/schedule/event/8VKQXR-blocknote-yjs-prosemirror/)」FOSDEM 2026、2026年2月1日。

[^fosdem-track]: FOSDEM「[Local-First, sync engines, CRDTs](https://archive.fosdem.org/2026/schedule/track/local-first/)」FOSDEM 2026。

[^wiggins]: Adam Wiggins「[Politics and emotion at Local-First Conf](https://adamwiggins.com/posts/politics-and-emotion-at-local-first-conf/)」2026年。
