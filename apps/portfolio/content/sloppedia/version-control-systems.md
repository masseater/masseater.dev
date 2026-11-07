---
title: "バージョン管理システムの一覧"
description: "ファイルの変更の履歴を記録して共有するソフトウェアの一覧。Git、Git互換のツール、Gitとは別の形式の分散型と集中型、2026年に公表されたAI企業の社内システムを扱う。"
tags: ["バージョン管理システム", "Git", "2026年のソフトウェア"]
published: true
infobox:
  - label: "分散型の例"
    value: "Git、Mercurial、Fossil、Pijul、Darcs、Breezy"
  - label: "集中型の例"
    value: "Subversion、P4、Unity Version Control、Lore、Scion"
  - label: "Git互換の例"
    value: "Jujutsu、Sapling、GitButler、gitoxide、Pando"
  - label: "情報の時点"
    value: "2026年11月3日"
---

バージョン管理システムは、ファイルの変更の履歴を記録し、複数の人や機械の間で共有するソフトウェアである。2026年の時点で最も広く使われているのは[Git](/sloppedia/git)で、その周りにGitのリポジトリをそのまま扱う互換のツールと、Gitの部品を別の言語で作り直した実装がある。ほかに、Gitとは別の形式を持つ分散型のシステムと、履歴の元をサーバーだけに置く集中型のシステムがある。

2026年には、コーディングエージェントが変更を出す量の急増を受けて、大規模なリポジトリの扱い方を作り直す動きが続いた。Anthropicは社内の[モノレポ](/sloppedia/monorepo-and-polyrepo)をGitから独自のScionに移し[^anthropic-scion]、OpenAIはGitと互換のままサーバー側をPandoに作り替えた[^openai-pando]。GitHubとCursorも、Gitのサーバーの書き込みの方式を変えたと公表している[^github-spokes][^cursor-continuity]。

## 分類

この記事では、次のように分ける。

| 分類                  | 内容                                                   | 例                                                            |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| Git                   | 分散型。2005年に作られ、2026年の事実上の標準           | Git                                                           |
| Git互換のクライアント | Gitのリポジトリを読み書きし、操作の体系を変える        | Jujutsu、Sapling、GitButler、git-branchless                   |
| Gitの実装             | Gitのデータ形式と通信の手順を別のコードで実装する      | libgit2、JGit、go-git、gitoxide、Dulwich、isomorphic-git      |
| Gitのサーバー         | Gitの通信の手順のまま、サーバー側の作りを変える        | Pando、GitHubのSpokes、CursorのContinuity                     |
| 独自形式の分散型      | Gitとは別のデータの持ち方をする                        | Mercurial、Fossil、Pijul、Darcs、Breezy                       |
| 集中型                | 履歴の元をサーバーに置き、クライアントは一部だけを持つ | Subversion、P4、Unity Version Control、Diversion、Lore、Scion |

Saplingは、Gitのリポジトリを扱うクライアントと、独自形式のサーバーの両方を持つため、2つの分類にまたがる[^sapling]。

## 歴史

初期のバージョン管理システムは、1つのファイルの版を手元で管理するRCSのようなものだった。その後、CVSとSubversionが、サーバーにリポジトリを置く集中型を広めた[^wikipedia-vcs]。

2005年、Linuxカーネルの開発で使っていた商用のBitKeeperが無償で使えなくなった。これを受けて、リーナス・トーヴァルズがGitを、マット・マコールがMercurialを、同じ年に作り始めた[^wikipedia-git][^mercurial]。2008年にGitHubが始まってから、Gitは利用者を急速に増やした[^wikipedia-git]。

## Git

Gitは、リーナス・トーヴァルズが2005年に作った分散型のバージョン管理システムである。どのクローンも履歴の完全な写しを持ち、手元だけで差分・履歴・ブランチを扱える。GPLv2で公開されている[^wikipedia-git]。2026年11月3日の時点で最新の安定版は2.56.0である[^git-tags]。

次の大きな版のGit 3.0では、新しいリポジトリの既定のハッシュをSHA-1からSHA-256に変え、参照の保存の形式をreftableに変える予定である。公式の文書は、3.0を出す日をまだ決めていないとしている[^git-breaking]。

## AI企業と開発基盤の動き

### Scion（Anthropic）

ScionはAnthropicが作った社内のバージョン管理システムで、同社は2026年10月13日にエンジニアリングの記事でこれを公表した。7人のチームが、コードレビューの道具のAntiqueとともに作り、5か月でモノレポをGitから移した[^anthropic-scion]。

記事によると、同社のモノレポで1日にマージされる変更は、2026年5月の約2,500件から、9月には30,000件を超えた。mainブランチの履歴だけで100GB近くあり、CIのチェックアウトは1日に2,500万回ほどに上る。最も多い時期には、数百のGitのミラーを動かしていた[^anthropic-scion]。

Scionの設計は、Gitの分散型の前提を捨てている。クライアントは常にサーバーにつながっている前提で、履歴やblameの問い合わせ、コミットの作成、マージやリベースはサーバーが行う。クライアントは上限のあるオブジェクトのキャッシュだけを持つ[^anthropic-scion]。データの単位は「changeset」で、最初の親からの変更のあったファイルの一覧と、ブロブストレージ上の圧縮した中身への内容アドレスを持つ。Gitのpackfileに当たるものは無い。サーバーは[Spanner](/sloppedia/spanner)とクラウドのストレージの上で動き、リポジトリの完全な写しはサーバーにも存在しない。チェックアウトはスパースか、ファイルを要るときだけ取り出す仮想化した形を基本とする[^anthropic-scion]。

記事は、ScionのCPUとメモリの使用量が以前のGitのミラーの200分の1になり、CIと研究のジョブのチェックアウトが分単位から秒単位に縮んだと述べている[^anthropic-scion]。マージキューについては、エージェントの規模ではリポジトリ全体のロックを取る従来の方式が成り立たないとし、マージ後とデプロイ前の自動テストに投資したと書いている[^anthropic-scion]。

先行例として、記事はGoogleの[Piper](/sloppedia/piper)とMetaのSaplingを挙げている。記事の注は、Saplingのサーバー側のMononokeがScionの使う手法の多くを先に実現しており、とくにBonsaiと呼ぶデータモデルがそうだと述べている[^anthropic-scion]。この注は、公表の2日後の10月15日に足された[^anthropic-scion][^nesbitt-1028]。

Anthropicは、Scionを「一般の用途でgitの代わりになるものでは決してない」としている。数万人の技術者か大量のエージェントがコードを書く巨大なモノレポでしか意味を持たない設計だとして、公開はせず、考え方をGitHub・GitLab・オープンソースのコミュニティと共有するとした[^anthropic-scion]。

### Pando（OpenAI）

PandoはOpenAIが作った、Gitのリポジトリのための新しいサーバー側の実装である。同社は2026年11月2日に、アーロン・フリール、テイラー・ブラウ、テッド・ナイマンの署名の記事「Scaling Git at OpenAI」で公表した。Gitの通信の手順とクライアントの互換を保ったまま、同社のモノレポのすべての開発を支えている[^openai-pando]。

記事によると、モノレポのmasterに入るコミットの数は、2024年第1四半期と比べて2026年第3四半期に1,378%増えた。2025年の末ごろからは取得とpushの遅れやマージの失敗が増え、信頼性が90%を下回ることもあった[^openai-pando]。

Pandoは、リポジトリ全体で参照の状態をそろえることをやめ、参照ごとの更新だけを順に並べる。記事はこれを因果一貫性と呼んでいる。pushされたpackfileは不変のブロブとしてブロブストアに置き、参照が動くたびに、新しい先端・それを運んだpackfile・依存する以前のref versionを「ref version」としてメタデータのストアに記録する[^openai-pando]。新しいブランチのpushに対しては、既定ではtrunkだけを知らせる。こうするとクライアントの作るpackfileはtrunkにだけ依存し、別の取得の応答にそのまま使い回せる[^openai-pando]。

取得では、Gitの`packfile-uri`の機能でpackfileの場所だけを返し、クライアントは地域ごとのキャッシュのExpressから取り出す。キャッシュの的中率は99%を超え、普通のクラウドの仮想マシンで10Gbpsの回線を使い切れたという[^openai-pando]。pushのたびにできる小さなpackfileは、LSMツリーの圧縮に似た方式で段階的に大きな「cover」にまとめ、2026年11月の時点でL4まで使っている[^openai-pando]。

PandoはRustで書かれ、着手から本番まで10週間で作られた。中核は1人の技術者が設計し、エージェントのチームが実装し、2026年4月から本番の通信を扱っている。記事は、GPT-6 Astraを使ってLeanとTLA+でPandoの性質を形式化し、実装の不具合を見つけたとも書いている[^openai-pando]。最初は既存のソース管理の前に置く読み書きの代理として動かし、通信を少しずつ移した。既存のシステムの名前は書かれていない[^openai-pando]。

記事は、中央値のpushの待ち時間が5分の1近くまで縮んだと述べている。1日に1ペタバイト近いGitのデータを少数のCPUコアで配り、1時間に57テラバイトを超えるpackを配った時もあるという[^openai-pando]。

OpenAIは、自社でビルドしたGitを開発機とChatGPTのデスクトップアプリに配り、その修正をGitHubの[openai/git](https://github.com/openai/git)で公開している。一部はすでに本家のGitに取り込まれた[^openai-pando]。Pando自体のソースコードは公開されていない。記事は、Pandoを支える技術を利用者と共有する方法を探っているとしている[^openai-pando]。

### GitHubとCursor

GitHubは2026年10月、リポジトリをAzureに移す作業の記事で、Gitのサーバーの部品Spokesの書き込みを変えたと述べた。従来はすべての書き込みがリポジトリ全体のロックを取っていたが、同じ参照への書き込みだけを順に並べる方式に切り替え、社内の試験で書き込みの量が3〜4倍になったという[^github-spokes][^nesbitt-1028]。

Cursorは2026年8月、Gitのホスティングの「Origin」のための保存の仕組みContinuityを公表した。Gitの形式はそのまま保ち、S3互換のストレージ上の先行書き込みログを唯一の確かな記録とし、各サーバーの手元のリポジトリはそこから作り直せるキャッシュとして扱う[^cursor-continuity]。

ほかに、GitHubの元CEOのトーマス・ドームケらが共同で創業したEntireや、Enrouteも、エージェントのpushの量に合わせたGitのサーバーを公表している[^nesbitt-1028]。

### Oak

Oakは、ザック・ギアーが作る、人とエージェントが一緒に使うためのバージョン管理システムである。ベータの間は無料で、組織ごとに100GBの保存領域が付く[^oak]。ファイルを読んだときに取り出す遅延マウント、メッセージの要らないチェックポイント、大きなファイルの分割と重複の排除を持つ。`oak export`で全履歴をGitのリポジトリに書き出せる[^oak]。公式サイトは、大きなバイナリを含む作業のスナップショットがGitより95%速いとしている。ただし、5万ファイルの初期化とプロセスの起動はGitのほうが速いとも書いている[^oak]。

## Git互換のクライアント

### Jujutsu

Jujutsu（コマンドは`jj`）は、マーティン・フォン・ツヴァイクベルクが2019年に個人の計画として始め、のちにGoogleでの仕事になったバージョン管理システムである。Rustで書かれ、Apache License 2.0で公開されている[^jj]。保存先にGitのリポジトリを使えるため、GitHubなどのGitのホスティングとそのまま併用できる[^jj]。

作業ディレクトリそのものをコミットとして扱うため、ステージングの段階が無い。すべての操作を操作ログに残し、どの操作も取り消せる。衝突はコミットの中にそのまま記録でき、解消を後に回せる。子孫のコミットは、親を書き換えると自動でリベースされる[^jj]。2026年10月7日に0.46.0が出ており、版はまだ1.0に達していない[^jj-crate]。

### Sapling

SaplingはMetaが社内で使い、2022年11月に公開したバージョン管理システムである。クライアントはMercurialから派生し、GitHubのGitのリポジトリを扱える。社内では、サーバーのMononokeと、ファイルを必要なときに取り出す仮想ファイルシステムのEdenFSと組み合わせて使う[^sapling]。積み重ねたコミットを1つずつのプルリクエストにする機能や、スマートログと呼ぶ履歴の表示を持つ。ライセンスはGPLv2である[^sapling]。版の番号に日付を入れて頻繁に出しており、2026年11月2日の日付のタグがある[^sapling-tags]。

### GitButler

GitButlerは、GitHubの共同創業者で『Pro Git』の著者のスコット・シャコンらが作る、Gitの上に作ったクライアントである。同じ作業ディレクトリで複数のブランチを同時に扱う「仮想ブランチ」と、積み重ねたブランチを扱う機能を持つ。デスクトップアプリはTauriとRustとSvelteで書かれ、2026年2月の0.19.0でほとんどの操作をコマンドラインからも使えるようになった[^gitbutler][^gitbutler-releases]。2026年4月に1,700万ドルのシリーズAの資金を集めたと報じられている[^pulse2-gitbutler]。2026年11月3日の時点で最新の安定版のタグは0.23.2である[^gitbutler-releases]。

### git-branchless

git-branchlessは、ワリード・カーンが作る、Gitに積み重ねたコミットの扱いを足す道具である。Gitの上で動き、コミットのグラフの表示や、操作の取り消し、子孫の自動のリベースを持つ。Rustで書かれている[^git-branchless]。最新のタグは0.11.1である[^git-branchless]。

## Gitの実装

Gitの機能をほかのプログラムから使うために、Gitを別の言語で実装したライブラリがある。ホスティングのサービスや開発環境、CIの多くは、これらのどれかでリポジトリを読む。

| 名前           | 言語       | 主な使われ方                               | 最新のリリース（2026年11月3日時点）                            |
| -------------- | ---------- | ------------------------------------------ | -------------------------------------------------------------- |
| libgit2        | C          | 各言語の拡張から呼ぶ。Rubyのruggedなど     | 1.9.7[^libgit2]                                                |
| JGit           | Java       | EclipseのEGit、[Gerrit](/sloppedia/gerrit) | 7.8.0（2026年9月1日）[^jgit]                                   |
| go-git         | Go         | Go製のツール                               | 5.19.3[^go-git]                                                |
| gitoxide       | Rust       | Rust製のツール                             | gix 0.90.0・gitoxide 0.61.0（2026年10月22日）[^gitoxide-crate] |
| Dulwich        | Python     | Python製のツール。Breezyのgit対応          | 1.2.20（2026年10月26日）[^dulwich]                             |
| isomorphic-git | JavaScript | ブラウザーとNode.js                        | 1.44.10（2026年11月2日）[^isomorphic-git]                      |

gitoxideは、セバスチャン・ティールが始めた、GitをRustだけで実装する計画である。ライブラリの`gix`と、コマンドラインの`gix`・`ein`からなり、MITとApache License 2.0の二重のライセンスで公開されている[^gitoxide]。0.61.0では、下位のクレートのエラーの型をRustの標準の形に合わせ、セキュリティの修正を入れた[^nesbitt-1028]。

## Gitとは別の形式の分散型

### Mercurial

Mercurialは、マット・マコールが2005年に作った分散型のバージョン管理システムである。PythonとRustで書かれ、GPLv2以降のライセンスで公開されている[^mercurial]。Meta（当時のFacebook）がMercurialを大規模なモノレポに合わせて拡張したものが、のちのSaplingになった[^sapling]。公式のリリースの一覧にある最新は、2026年1月29日の7.2である[^mercurial]。

### Fossil

Fossilは、SQLiteの作者のD・リチャード・ヒップが2006年に作った分散型のバージョン管理システムである。リポジトリを1つのSQLiteのデータベースのファイルに入れ、バグ管理・wiki・フォーラム・Webの画面を1つの実行ファイルに同梱する。SQLite自身の開発に使われている[^fossil]。ライセンスはBSDの2条項のものである。最新のリリースは2026年3月11日の2.28である[^fossil-changes]。

### Pijul

Pijulは、ピエール＝エティエンヌ・ムニエが作る、パッチの理論に基づく分散型のバージョン管理システムである。履歴を状態の並びとして持たず、順番を入れ替えても結果が変わらないパッチの集まりとして持つ。このため、同じ変更をどの順で取り込んでも同じ結果になり、チェリーピックの後に衝突が繰り返されない。衝突は解消されるまで状態として残る[^pijul]。Rustで書かれ、GPLv2で公開されている。2026年10月30日に1.0.0-beta.26が出ており、1.0は2026年11月3日の時点でまだ出ていない[^pijul-crate]。

### Darcs

Darcsは、デイヴィッド・ラウンディが2002年ごろに作った、パッチの理論に基づく分散型のバージョン管理システムである。Haskellで書かれ、Pijulが同じ考え方を引き継いだ[^darcs][^pijul]。最新のリリースは2025年1月の2.18.5である[^darcs]。

### Breezy

Breezyは、CanonicalのBazaarを引き継いで有志が開発する分散型のバージョン管理システムである。Bazaarの形式に加え、Gitのリポジトリも扱える。PythonとRustで書かれている[^breezy]。最新のリリースは2026年10月31日の3.3.24である[^breezy]。

### Radicle

Radicleは、Gitのリポジトリを中央のサーバーを置かずにピアどうしで共有する仕組みである。履歴はGitの形式のまま持ち、イシューやパッチのやり取りもリポジトリの中に記録する[^radicle]。最新のリリースは1.10.3である[^radicle-tags]。

## 集中型

### Subversion

Subversion（SVN）は、CVSの後継を目指して2000年に始まった集中型のバージョン管理システムで、Apacheソフトウェア財団が開発している[^wikipedia-vcs][^svn]。ディレクトリの単位でチェックアウトでき、大きなバイナリを扱いやすい。2026年10月8日に1.15.0が出た[^svn]。

### P4

P4は、[Perforce](/sloppedia/perforce)の集中型のバージョン管理システムで、以前はHelix Coreと呼ばれていた。大きなバイナリと巨大なリポジトリに強く、ゲームの開発で広く使われている[^perforce-docs]。最新のサーバーの系列は2026.1である[^perforce-docs]。

### Unity Version Control

Unity Version Controlは、スペインのCódice Softwareが作ったPlastic SCMを、2020年にUnityが買収して名前を変えたものである。分散型と集中型のどちらの使い方もでき、ゲームの開発に向けた画面を持つ[^unity-vcs]。

### Diversion

Diversionは、ゲームと創作の開発に向けたクラウドで動く集中型のバージョン管理システムである。保存のたびに作業領域を同期し、ステージングとpushの段階を持たない[^diversion]。2026年7月のCEDECで、クリーチャーズが導入の事例を発表した[^cedec-diversion]。

### Lore

Loreは、Epic Gamesが2026年6月にMITライセンスで公開した、集中型で内容アドレス方式のバージョン管理システムである。社内のUnreal Revision Controlから育ち、UEFN（Unreal Editor for Fortnite）に組み込まれている。コードと大きなバイナリを併せ持つ計画を主な対象とし、Rustで書かれている[^lore][^phoronix-lore]。最新のタグは0.12.0である[^lore-tags]。

## 比較

| 名前                  | 開発元      | 型         | Gitとの関係                     | 言語              | ライセンス      | 確認した最新のリリース |
| --------------------- | ----------- | ---------- | ------------------------------- | ----------------- | --------------- | ---------------------- |
| Git                   | 有志        | 分散       | 本体                            | C                 | GPL-2.0         | 2.56.0                 |
| Scion                 | Anthropic   | 集中       | 独自形式                        | 不明              | 非公開          | 社内のみ               |
| Pando                 | OpenAI      | サーバー   | Git互換                         | Rust              | 非公開          | 社内のみ               |
| Oak                   | Oak         | 集中       | Gitへ書き出せる                 | 不明              | 不明            | ベータ                 |
| Jujutsu               | Google ほか | 分散       | Gitを保存先に使う               | Rust              | Apache-2.0      | 0.46.0                 |
| Sapling               | Meta        | 分散       | Gitを扱えるクライアント         | Rust・Python ほか | GPL-2.0         | 2026年11月2日のタグ    |
| GitButler             | GitButler   | 分散       | Gitの上に作ったクライアント     | Rust・TypeScript  | FSL             | 0.23.2                 |
| Mercurial             | 有志        | 分散       | 独自形式                        | Python・Rust      | GPL-2.0以降     | 7.2                    |
| Fossil                | 有志        | 分散       | 独自形式（Gitへの書き出しあり） | C                 | BSD-2-Clause    | 2.28                   |
| Pijul                 | 有志        | 分散       | 独自形式                        | Rust              | GPL-2.0         | 1.0.0-beta.26          |
| Darcs                 | 有志        | 分散       | 独自形式                        | Haskell           | GPL-2.0以降     | 2.18.5                 |
| Breezy                | 有志        | 分散       | Gitも扱える                     | Python・Rust      | GPL-2.0以降     | 3.3.24                 |
| Radicle               | Radicle     | ピアどうし | Gitの形式                       | Rust              | MIT・Apache-2.0 | 1.10.3                 |
| Subversion            | Apache      | 集中       | 独自形式                        | C                 | Apache-2.0      | 1.15.0                 |
| P4                    | Perforce    | 集中       | 独自形式                        | C++               | 商用            | 2026.1                 |
| Unity Version Control | Unity       | 両方       | 独自形式                        | C#                | 商用            | 不明                   |
| Diversion             | Diversion   | 集中       | 独自形式                        | 不明              | 商用            | 不明                   |
| Lore                  | Epic Games  | 集中       | 独自形式                        | Rust              | MIT             | 0.12.0                 |

## 外部リンク

- [Redesigning source control at Anthropic](https://www.anthropic.com/research/redesigning-source-control)
- [Scaling Git at OpenAI](https://openai.com/index/scaling-git-at-openai/)
- [Git](https://git-scm.com/)
- [Jujutsu（GitHub）](https://github.com/jj-vcs/jj)
- [Sapling](https://sapling-scm.com/)
- [GitButler](https://gitbutler.com/)
- [gitoxide（GitHub）](https://github.com/GitoxideLabs/gitoxide)
- [Mercurial](https://www.mercurial-scm.org/)
- [Fossil](https://fossil-scm.org/)
- [Pijul](https://pijul.org/)
- [Subversion](https://subversion.apache.org/)
- [Lore（GitHub）](https://github.com/EpicGames/lore)
- [Oak](https://oak.space/)

[^anthropic-scion]: Anthropic「[Redesigning source control at Anthropic](https://www.anthropic.com/research/redesigning-source-control)」2026年10月13日公開、10月15日更新。2026年11月3日閲覧。

[^openai-pando]: Aaron Friel、Taylor Blau、Ted Nyman「[Scaling Git at OpenAI](https://openai.com/index/scaling-git-at-openai/)」OpenAI、2026年11月2日。2026年11月3日閲覧。

[^github-spokes]: Eleanor White、Victoria Dye「[The bridge to agent-scale Git infrastructure](https://github.blog/engineering/architecture-optimization/the-bridge-to-agent-scale-git-infrastructure/)」GitHub Blog、2026年10月。2026年11月3日閲覧。

[^cursor-continuity]: Vicent Martí「[Git at any scale](https://cursor.com/blog/git-at-any-scale)」Cursor、2026年8月18日。2026年11月3日閲覧。

[^nesbitt-1028]: Andrew Nesbitt「[This Week in Source Control: 28 October 2026](https://nesbitt.io/2026/10/28/this-week-in-source-control.html)」2026年10月28日。2026年11月3日閲覧。

[^oak]: 「[Oak](https://oak.space/)」。2026年11月3日閲覧。

[^wikipedia-vcs]: 「[Version control](https://en.wikipedia.org/wiki/Version_control)」Wikipedia（英語版）。2026年11月3日閲覧。

[^wikipedia-git]: 「[Git](https://en.wikipedia.org/wiki/Git)」Wikipedia（英語版）。2026年11月3日閲覧。

[^git-tags]: 「[git/git のタグ](https://github.com/git/git/tags)」GitHub。2026年11月3日閲覧。

[^git-breaking]: 「[Upcoming breaking changes](https://git-scm.com/docs/BreakingChanges)」Git。2026年11月3日閲覧。

[^jj]: 「[jj-vcs/jj](https://github.com/jj-vcs/jj)」GitHub。2026年11月3日閲覧。

[^jj-crate]: 「[jj-cli](https://crates.io/crates/jj-cli)」crates.io。2026年11月3日閲覧。

[^sapling]: 「[Sapling SCM](https://sapling-scm.com/)」。2026年11月3日閲覧。

[^sapling-tags]: 「[facebook/sapling のタグ](https://github.com/facebook/sapling/tags)」GitHub。2026年11月3日閲覧。

[^gitbutler]: 「[GitButler](https://gitbutler.com/)」。2026年11月3日閲覧。

[^gitbutler-releases]: 「[gitbutlerapp/gitbutler のリリース](https://github.com/gitbutlerapp/gitbutler/releases)」GitHub。2026年11月3日閲覧。

[^pulse2-gitbutler]: 「[GitButler: $17 Million Series A Raised…](https://pulse2.com/gitbutler-17-million-series-a-raised-to-build-next-generation-software-development-infrastructure-beyond-git/)」Pulse 2.0、2026年4月13日。2026年11月3日閲覧。

[^git-branchless]: 「[arxanas/git-branchless](https://github.com/arxanas/git-branchless)」GitHub。2026年11月3日閲覧。

[^libgit2]: 「[libgit2/libgit2 のタグ](https://github.com/libgit2/libgit2/tags)」GitHub。2026年11月3日閲覧。

[^jgit]: 「[eclipse-jgit/jgit のタグ](https://github.com/eclipse-jgit/jgit/tags)」GitHub。2026年11月3日閲覧。

[^go-git]: 「[go-git/go-git のタグ](https://github.com/go-git/go-git/tags)」GitHub。2026年11月3日閲覧。

[^gitoxide]: 「[GitoxideLabs/gitoxide](https://github.com/GitoxideLabs/gitoxide)」GitHub。2026年11月3日閲覧。

[^gitoxide-crate]: 「[gix](https://crates.io/crates/gix)」「[gitoxide](https://crates.io/crates/gitoxide)」crates.io。2026年11月3日閲覧。

[^dulwich]: 「[dulwich](https://pypi.org/project/dulwich/)」PyPI。2026年11月3日閲覧。

[^isomorphic-git]: 「[isomorphic-git](https://www.npmjs.com/package/isomorphic-git)」npm。2026年11月3日閲覧。

[^mercurial]: 「[Mercurial SCM](https://www.mercurial-scm.org/)」。2026年11月3日閲覧。

[^fossil]: 「[Fossil](https://fossil-scm.org/)」。2026年11月3日閲覧。

[^fossil-changes]: 「[Change Log](https://fossil-scm.org/home/doc/trunk/www/changes.wiki)」Fossil。2026年11月3日閲覧。

[^pijul]: 「[Pijul](https://pijul.org/)」。2026年11月3日閲覧。

[^pijul-crate]: 「[pijul](https://crates.io/crates/pijul)」crates.io。2026年11月3日閲覧。

[^darcs]: 「[darcs](https://hackage.haskell.org/package/darcs)」Hackage。2026年11月3日閲覧。

[^breezy]: 「[breezy](https://pypi.org/project/breezy/)」PyPI。2026年11月3日閲覧。

[^radicle]: 「[Radicle](https://radicle.xyz/)」。2026年11月3日閲覧。

[^radicle-tags]: 「[radicle-dev/heartwood のタグ](https://github.com/radicle-dev/heartwood/tags)」GitHub。2026年11月3日閲覧。

[^svn]: 「[Apache Subversion News](https://subversion.apache.org/news.html)」Apache Software Foundation。2026年11月3日閲覧。

[^perforce-docs]: 「[P4 Detect release notes 2026.1](https://ftp.perforce.com/perforce/r26.1/doc/user/p4detect_notes.txt)」Perforce。2026年11月3日閲覧。

[^unity-vcs]: 「[Unity Version Control](https://docs.unity.com/ko-kr/unity-version-control/vcs-plugins/unityeditor-plugin/landing)」Unity Documentation。2026年11月3日閲覧。

[^diversion]: 「[Diversion](https://www.diversion.dev/product)」。2026年11月3日閲覧。

[^cedec-diversion]: 「[Modernizing Development Pipelines with Cloud-Native Version Control "Diversion" #CEDEC2026](https://dev.classmethod.jp/en/articles/cedec-2026-diversion/)」DevelopersIO。2026年11月3日閲覧。

[^lore]: 「[EpicGames/lore](https://github.com/EpicGames/lore)」GitHub。2026年11月3日閲覧。

[^phoronix-lore]: 「[Epic Games Announces Lore Open-Source Version Control System](https://www.phoronix.com/news/Epic-Games-Lore-VCS)」Phoronix、2026年6月。2026年11月3日閲覧。

[^lore-tags]: 「[EpicGames/lore のタグ](https://github.com/EpicGames/lore/tags)」GitHub。2026年11月3日閲覧。
