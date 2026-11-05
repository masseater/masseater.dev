---
title: "houritsu"
description: "日本の法令を、改正法の施行1件を1コミットとする git の履歴にしたリポジトリ。"
tags: ["法令", "Git", "オープンデータ", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Kohei-Wada"
  - label: "データの出典"
    value: "e-Gov法令検索（法令API v2）"
  - label: "形式"
    value: "Markdown と YAML の frontmatter"
  - label: "ブランチ"
    value: "main（施行済み）、upcoming（公布済みで未施行）"
  - label: "ライセンス"
    value: "CC BY 4.0（生成する道具は MIT）"
  - label: "リポジトリ"
    value: "Kohei-Wada/houritsu"
    href: "https://github.com/Kohei-Wada/houritsu"
---

houritsu は、日本のすべての法令を git の履歴として収めたリポジトリである。改正する法令が1つ施行されるごとに1コミットを作る。このため `git log` で1つの法令の改正の歴史を、`git show` で1回の改正が変えた中身を読める[^readme]。

## 作り方

e-Gov法令検索の法令 API v2 のデータを、同じ作者の houritsu-builder が Markdown に変えて作る。houritsu-builder は Rust で書かれ、MIT ライセンスで公開されている[^readme][^builder]。条文の文字は変えていない。足したのは、見出しの記号、Markdown のためのエスケープ、図へのリンクだけである[^readme]。

2026年11月5日の時点で、main には23,345のコミットがあり、最新は11月2日の施行の分だった[^clone]。

## 構成

法令は `laws/<法令の種類>/<法令 ID の先頭3文字>/<法令 ID>.md` に置く。先頭3文字は公布の元号と年を表し、`415` は平成15年である。ファイル名は e-Gov の法令 ID なので、題名が変わっても変わらない[^readme]。

表は結合したセルを保つために HTML で書く。図と様式は e-Gov の添付ファイルへのリンクにする。目次は見出しの繰り返しなので省く[^readme]。

ブランチは2つある。main は施行された版を、upcoming は公布されてまだ施行されていない版を持つ[^readme]。

## コミット

コミットの日付は施行日の0時（日本時間）である。トレーラーに、改正する法令の ID と施行日を書く。法律の改正なら、国会の議案の番号、提出者、衆議院のサイトにある議案の本文の URL も書く[^readme]。議案との対応は、スマートニュース メディア研究所の衆議院議案データベースから取っている[^readme]。

git は1970年より前の日付を記録できない。それより前の施行日は1970年1月2日として記録し、本当の日付はトレーラーと frontmatter に残す[^readme]。施行日がまだ決まっていない改正は、e-Gov が仮に使う2117年12月31日の日付で upcoming の最後に置く[^readme]。

廃止された法令のファイルは、廃止する法令のコミットで消える。それまでの履歴は `git log` で追える[^readme]。

## 限界

README は限界をいくつか挙げている[^readme]。

履歴は制定時からではなく、2015年ごろから始まる。e-Gov の改正のデータがそのころから増えるためで、コミットの日付の推移は立法の量だけでなく e-Gov の収録の範囲も表す。同じ理由で、`git blame` が示す日付は文言ができた日ではなく収録が始まった日になる。刑法の大部分は2016年のコミットに行き着く。

およそ3分の1の法令はコミットが1つしかない。古い日付を取り出しても、e-Gov が後から収録した法令は古い条文ではなくファイルの無い状態で現れる。2010年1月1日の時点ではおよそ2,800の法令しか無く、今はおよそ9,000ある。

1.0 の版が出るまでは、履歴を作り直して force-push することがある。版を指すときはコミットの SHA ではなく、frontmatter の法令 ID と改正の ID を使うよう勧めている。

## ライセンス

データは CC BY 4.0 で配る。元の法令データの公共データ利用規約（PDL1.0）がこれを認めている。条文そのものは著作権法第13条により著作権の対象ではない[^readme]。公式の条文は官報に載ったものであり、法的な助言ではないとも断っている[^readme]。

[^readme]: Kohei-Wada「[houritsu](https://github.com/Kohei-Wada/houritsu)」GitHub。2026年11月5日に閲覧。

[^builder]: Kohei-Wada「[houritsu-builder](https://github.com/Kohei-Wada/houritsu-builder)」GitHub。2026年11月5日に閲覧。

[^clone]: main ブランチを2026年11月5日に取得して数えた。
