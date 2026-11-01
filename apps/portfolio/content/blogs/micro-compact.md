---
title: "人間は読みながら要約する"
description: "人間は文書を、読みながら自分の解釈に要約して次へ進む。言い回しは消えて要旨だけが残るので、文書は要約が作りやすい単位で区切って書く必要がある。読解と記憶の研究から、この前提と書き方への含意を整理する。"
tags: ["認知", "文章", "AI"]
published: false
---

このブログの記事も、ドキュメントも、多くを AI に書かせている。そのときに困るのが、AI と人間では文章の読み方がまるで違うことである。

AI は、渡された文書を全部保持したまま読める。人間は違う。人間は読みながら、その都度自分の解釈に要約して、要約だけを持って次へ進む。私はこの小さな圧縮を繰り返す読み方を、マイクロコンパクトと呼んでいる。文書の書き方は、この違いを前提にしないと成り立たない。

## 読みながら要約する仕組み

読みながらの要約は、読解研究ではマクロ規則としてモデル化されている。van Dijk と Kintsch は、読み手が命題の列に削除、一般化、構成を繰り返し適用して、文章の要旨を作るとした[^kintsch-vandijk-1978]。読み手は全文を保持しない。畳んだ要旨を保持し、細部は順に手放していく。

要旨が本文の側に用意されていないと、読み手は自分で作る。Brown と Day は、要約を作る規則の中に、主題文がない場合の発明を加えた[^brown-day-1983]。段落の冒頭に要旨がないと、読み手は主題を発明し、その主題は書き手の意図とずれうる。段落ごとに要旨を先に置くのは、読み手の発明を書き手の意図の側へ寄せるためである。

## 残るのは要旨だけ

言い回しは、理解が済んだ直後から消えていく。Sachs の実験では、意味が同じで言い回しだけが違う文を、読み手は元の文だと誤認した。間に挟む文章が増えるほど、誤認も増えた[^sachs-1967]。逐語的な痕跡は要旨の痕跡より速く減衰するという二重痕跡理論も、同じ方向を示している[^fuzzy-trace]。

だから、定義や数値のような細部が後の判断に要る文書では、読み手の記憶に頼る設計は成り立たない。細部は、使う場所の近くに置き直す。逆に、一度だけ正しく伝わればよい部分では、要旨が正しく畳まれることに資源を割くべきである。

## 枠組みの置き場所

文脈は、読む前に渡さないと効かない。Bransford と Johnson の実験では、曖昧な手順文でも、内容を示す絵を読み前に見た群は、理解と再生がほぼ2倍になった。読み後に見た群は、見なかった群と変わらなかった[^bransford-johnson-1972]。

冒頭に目的と対象を置くのは、このためである。読み手は枠組みを使って、読みながら理解を組み立てる。末尾のまとめで初めて文脈を渡す構成は、読みながらの理解を助けない。

## 区切りと見出し

区切りの大きさは、数では決められない。Miller の 7±2 は、絶対判断と即時記憶についての概数で、本人も修辞的な見積もりと位置づけていた[^miller-1956]。Cowan の再評価では、中心的な容量は 4±1 チャンク程度とされる[^cowan-2001]。ただし、この数も、文書を何個に区切るべきかを決める定数にはならない。チャンクの大きさは読み手の知識で変わるためである。効くのは数ではなく読み手の知識で 1 つのまとまりとして成立する単位に切ることである。

見出しは、読み手の要約そのものになる。見出しのあるテキストでは、話題の記憶が良くなり、要約にも残りやすくなる[^lorch-1996][^lorch-2001]。逆に、内容とずれた見出しは、読み手の理解を歪める[^kozminsky-1977]。一部の節にだけ見出しを付けると、見出しのない話題は読み手の要約から落ちやすい。見出しは、付ける範囲と粒度をそろえて初めて地図になる。

## 浅い読みの前提

読み手は、全文を均等には処理しない。熟練した読み手でも、語の約30% は注視されずに読み飛ばされる[^rayner-1998]。理解は、課題に足りる深さで止まることがある[^ferreira-patson-2007]。

例外や禁止のような重要な制約を本文の流れに埋めると、この浅い処理で流される。制約は流れから切り出して、箇条書きや独立した段落に置く。受動態や二重否定のような、もっともらしい誤解に引っ張られやすい文型を避けるのも、同じ理由である。

## 戻って引ける文書

文書は、覚えさせるものではなく、戻って引くものである。人間は内部の保持の限界を、外部に書き出すことで日常的に補っている[^risko-gilbert-2016]。

読み手がどうせ要約して次へ進むのなら、書き手の仕事は 2 つになる。その要約が正しく作られる単位を用意することと、細部に戻って引ける形を保つことである。AI に書かせる文章ほど、この前提が要る。AI は全部を保持したまま書けるので、前提を渡さなければ、人間に読める単位で区切る理由を持たない。

[^kintsch-vandijk-1978]: Kintsch & van Dijk (1978) Toward a model of text comprehension and production. *Psychological Review*, 85(5), 363–394.
[^brown-day-1983]: Brown & Day (1983) Macrorules for summarizing texts: The development of expertise. *Journal of Verbal Learning and Verbal Behavior*, 22(1), 1–14.
[^sachs-1967]: Sachs (1967) Recognition memory for syntactic and semantic aspects of connected discourse. *Perception & Psychophysics*, 2(9), 437–442. [DOI: 10.3758/BF03208784](https://doi.org/10.3758/BF03208784)
[^fuzzy-trace]: Reyna & Brainerd (1995) Fuzzy-trace theory: An interim synthesis. *Learning and Individual Differences*, 7(1), 1–75. 系統的レビューは [PMC8677658](https://pmc.ncbi.nlm.nih.gov/articles/PMC8677658/) を参照。
[^bransford-johnson-1972]: Bransford & Johnson (1972) Contextual prerequisites for understanding: Some investigations of comprehension and recall. *Journal of Verbal Learning and Verbal Behavior*, 11(6), 717–726.
[^miller-1956]: Miller (1956) The magical number seven, plus or minus two: Some limits on our capacity for processing information. *Psychological Review*, 63(2), 81–97.
[^cowan-2001]: Cowan (2001) The magical number 4 in short-term memory: A reconsideration of mental storage capacity. *Behavioral and Brain Sciences*, 24(1), 87–114. [PubMed](https://pubmed.ncbi.nlm.nih.gov/11515286/)
[^lorch-1996]: Lorch & Lorch (1996) Effects of headings on text recall and summarization. *Contemporary Educational Psychology*, 21(3), 261–278.
[^lorch-2001]: Lorch et al. (2001) Effects of headings on text summarization. *Contemporary Educational Psychology*, 26(2), 171–191.
[^kozminsky-1977]: Kozminsky (1977) Altering comprehension: The effect of biasing titles on text comprehension. *Memory & Cognition*, 5(4), 482–490.
[^rayner-1998]: Rayner (1998) Eye movements in reading and information processing: 20 years of research. *Psychological Bulletin*, 124(3), 372–422.
[^ferreira-patson-2007]: Ferreira & Patson (2007) The 'good enough' approach to language comprehension. *Language and Linguistics Compass*, 1(1–2), 71–83.
[^risko-gilbert-2016]: Risko & Gilbert (2016) Cognitive offloading. *Trends in Cognitive Sciences*, 20(9), 676–688. [PubMed](https://pubmed.ncbi.nlm.nih.gov/27542527/)
