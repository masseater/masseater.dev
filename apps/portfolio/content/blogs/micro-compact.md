---
title: "人は読みながら要約する"
description: "人はドキュメントを読み進める中で、それを自分なりの解釈にまとめ、次へと移していく。文言が消えて要点だけが残るため、ドキュメントは要約しやすい単位に分割する必要がある。読解力と記憶に関する研究を踏まえ、本記事ではこの前提と、それが文章の書き方にどのような意味を持つのかを整理する。"
tags: ["認知", "文章", "AI"]
published: true
stage: idea
---

このブログの記事の多くや、ドキュメントの多くはAIに執筆してもらった。そこで困るのは、AIと人間では文章の読み方が全く違うことだ。

AIはドキュメントをすべて保持したまま読み取ることができる。人間は違う。人々は読むたびに自分なりの解釈にまとめ、要約だけを持って先に進む。小さな圧縮を繰り返すこの読み方を、私はマイクロコンパクトと呼ぶ。文書の書き方は、この違いを前提としなければ成り立たない。

## 読みながら要約する方法

読みながら要約することは、読解研究においてマクロルールとしてモデル化されてきた。van DijkとKintschは、読者が一連の命題に対して削除、一般化、構成を繰り返し適用することで、テキストの要旨を構築すると提唱した[^kintsch-vandijk-1978]。読者は全文を保持していない。彼らは要点を押さえて、詳細を次々と省いていく。

本文で要点が示されていない場合、読者が自ら要点を導き出す。要約作成のルールの1つに、トピックセンテンスがない場合の発明が追加された[^brown-day-1983]。段落の冒頭に要点がない場合、読者がトピックを考案し、そのトピックが書き手の意図から逸れることがある。各段落で要点を先に提示することで、読者の考案を筆者の意図へと引き寄せることができる。

## 要点だけが残る

理解が完了した直後に、文言が消え始める。サックスの実験では、読者が元の文と同じ意味でありながら表現が異なる文を誤認した。間にテキストを挿入すればするほど、これらのミスは増えた[^sachs-1967]。逐語的なトレースは要旨的なトレースよりも速く減衰するとするファジィトレース理論も、同じ方向を指している[^fuzzy-trace]。

つまり、後で判断するために定義や数値などの詳細が必要な文書では、読者の記憶に頼る設計は通用しない。詳細を、使用箇所の近くに再度配置する。逆に、一度正しく伝われば十分な箇所については、要点が正しく折り畳まれているかを確認する作業にリソースを割くべきだ。

## フレームワークをどこに配置するか

文脈は読み取り前に与えられない限り機能しない。ブランズフォードとジョンソンの実験では、曖昧な手続き的テキストであっても、読む前に内容を示す画像を見たグループでは、理解度と想起力がほぼ倍増した。読んだ後に見たグループは、全く見なかったグループと変わりなかった[^bransford-johnson-1972]。

だからこそ、冒頭に目的と主語を置くのだ。読者はフレームワークを利用して、読みながら理解を深めていく。末尾の要約で初めてコンテキストを提示する構成は、読解の助けにならない。

## 区分と見出し

分割のサイズは数値では決められない。ミラーの7±2は、絶対的な判断と即時記憶に関する近似的な数値であり、ミラー自身はこれを修辞的な推定値として位置づけていた[^miller-1956]。Cowanの再評価では、中心となる容量は約4±1チャンクとされている[^cowan-2001]。しかし、この数値は、ドキュメントをどちらにいくつ分割すべきかを決定する定数ではない。これは、読み手の知識によってチャンクのサイズが変わるためである。有効なのは数値ではなく、読者の知識を前提として、1つのまとまりとして機能する単位を切り出すことだ。

見出しは読者の要約そのものになる。見出しのある文章では、トピックの記憶が向上し、要約に残りやすくなる[^lorch-1996][^lorch-2001]。逆に、内容と一致しない見出しは読者の理解を歪める[^kozminsky-1977]。一部のセクションにのみ見出しが付いていれば、見出しのないトピックは読者の要約から抜け落ちやすくなる。見出しがマップになるのは、カバーする範囲と粒度を統一したときのみである。

## 浅い読解の前提

読者はテキストのすべてを均等に処理するわけではない。熟練した読者であっても、単語の30%ほどはこだわりなく読み飛ばす[^rayner-1998]。理解は、タスクに十分な深さまで到達することがある[^ferreira-patson-2007]。

例外や禁止事項といった重要な制約が文章の流れの中に埋もれていると、この浅い処理に飲み込まれてしまう。フローから制約を切り離し、箇条書きや個別の段落にまとめよ。受動態や二重否定など、読者をもっともらしい誤解に陥れやすい文型を避けるのも、同じ理由からだ。

## 遡って調べられるドキュメント

ドキュメントは暗記するものでなく、遡って調べるものだ。人々は日常的に、頭の中で保持できる範囲の限界を補うために、外部に書き出す[^risko-gilbert-2016]。

読者がどうせ要約して次に進むのであれば、書き手の役割は結局のところ2点に集約される。その要約が正しく行われる単位を提供し、読者が戻って詳細を調べられる形式を維持すること。AIの書くテキストが増えれば増えるほど、この前提が必要になる。AIは何でも保持したまま書けるので、前提条件を与えない限り、人間が読める単位にテキストを分割する理由はない。

[^kintsch-vandijk-1978]: Kintsch & van Dijk (1978) Toward a model of text comprehension and production. _Psychological Review_, 85(5), 363–394.

[^brown-day-1983]: Brown & Day (1983) Macrorules for summarizing texts: The development of expertise. _Journal of Verbal Learning and Verbal Behavior_, 22(1), 1–14.

[^sachs-1967]: Sachs (1967) Recognition memory for syntactic and semantic aspects of connected discourse. _Perception & Psychophysics_, 2(9), 437–442. [DOI: 10.3758/BF03208784](https://doi.org/10.3758/BF03208784)

[^fuzzy-trace]: Reyna & Brainerd (1995) Fuzzy-trace theory: An interim synthesis. _Learning and Individual Differences_, 7(1), 1–75. システマティックレビューについては、[PMC8677658](https://pmc.ncbi.nlm.nih.gov/articles/PMC8677658/)を参照されたい。

[^bransford-johnson-1972]: Bransford & Johnson (1972) Contextual prerequisites for understanding: Some investigations of comprehension and recall. _Journal of Verbal Learning and Verbal Behavior_, 11(6), 717–726.

[^miller-1956]: Miller (1956) The magical number seven, plus or minus two: Some limits on our capacity for processing information. _Psychological Review_, 63(2), 81–97.

[^cowan-2001]: Cowan (2001) The magical number 4 in short-term memory: A reconsideration of mental storage capacity. _Behavioral and Brain Sciences_, 24(1), 87–114. [PubMed](https://pubmed.ncbi.nlm.nih.gov/11515286/)

[^lorch-1996]: Lorch & Lorch (1996) Effects of headings on text recall and summarization. _Contemporary Educational Psychology_, 21(3), 261–278.

[^lorch-2001]: Lorch et al. (2001) Effects of headings on text summarization. _Contemporary Educational Psychology_, 26(2), 171–191.

[^kozminsky-1977]: Kozminsky (1977) Altering comprehension: The effect of biasing titles on text comprehension. _Memory & Cognition_, 5(4), 482–490.

[^rayner-1998]: Rayner (1998) Eye movements in reading and information processing: 20 years of research. _Psychological Bulletin_, 124(3), 372–422.

[^ferreira-patson-2007]: Ferreira & Patson (2007) The 'good enough' approach to language comprehension. _Language and Linguistics Compass_, 1(1–2), 71–83.

[^risko-gilbert-2016]: Risko & Gilbert (2016) Cognitive offloading. _Trends in Cognitive Sciences_, 20(9), 676–688. [PubMed](https://pubmed.ncbi.nlm.nih.gov/27542527/)
