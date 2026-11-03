---
title: "Git互換・代替のバージョン管理システム"
description: "Gitのリポジトリをそのまま扱える互換のツールと、Gitに代わる独自の仕組みを持つバージョン管理システムの一覧。2026年にはAnthropicのScionとOpenAIのPandoが公表された。"
tags: ["バージョン管理システム", "Git", "2026年のソフトウェア"]
published: true
infobox:
  - label: "互換の主な例"
    value: "Jujutsu、Sapling、gitoxide、GitButler、Pando"
  - label: "代替の主な例"
    value: "Scion、Pijul、Fossil、Mercurial"
  - label: "情報の時点"
    value: "2026年11月3日"
---

Git互換・代替のバージョン管理システムは、Gitのリポジトリや通信の手順をそのまま扱いながら操作や内部の実装を変えたツールと、Gitとは別のデータの持ち方をするバージョン管理システムの総称である。前者は既存のGitのホスティングと併用でき、後者は移行を伴う代わりに、Gitの設計では難しい性質を得る。

2026年には、コーディングエージェントによる変更の急増を受けて、AnthropicとOpenAIがそれぞれ社内のリポジトリ向けの仕組みを公表した。Anthropicはモノレポを独自のバージョン管理システムのScionに移し[^anthropic-scion]、OpenAIはGitと互換のサーバー側の実装であるPandoを作った[^blockchain-pando]。どちらも社内向けで、外部には提供されていない。

## 分類

この記事では、Gitとの関係で次の3つに分ける。

| 分類                  | 内容                                              | 例                              |
| --------------------- | ------------------------------------------------- | ------------------------------- |
| Gitの実装             | Gitのデータ形式と通信の手順を別のコードで実装する | gitoxide、Pando                 |
| Git互換のクライアント | Gitのリポジトリを読み書きし、操作の体系を変える   | Jujutsu、Sapling、GitButler     |
| 独自形式の代替        | Gitとは別のデータの持ち方をする                   | Scion、Pijul、Fossil、Mercurial |

Saplingは、Gitのリポジトリを扱うクライアントと、独自形式のサーバーの両方を持つため、2つの分類にまたがる[^sapling]。

## AI企業の社内システム

### Scion（Anthropic）

ScionはAnthropicが作った社内のバージョン管理システムで、同社は2026年10月13日にエンジニアリングの記事でこれを公表した。7人のチームが、コードレビューの道具のAntiqueとともに作り、5か月でモノレポをGitから移した[^anthropic-scion]。

記事によると、同社のモノレポで1日にマージされる変更は、2026年5月の約2,500件から、9月には30,000件を超えた。mainブランチの履歴だけで100GB近くあり、CIのチェックアウトは1日に2,500万回ほどに上る。最も多い時期には、数百のGitのミラーを動かしていた[^anthropic-scion]。

Scionの設計は、Gitの分散型の前提を捨てている。クライアントは常にサーバーにつながっている前提で、履歴やblameの問い合わせ、コミットの作成、マージやリベースはサーバーが行う。クライアントは上限のあるオブジェクトのキャッシュだけを持つ[^anthropic-scion]。データの単位は「changeset」で、最初の親からの変更のあったファイルの一覧と、ブロブストレージ上の圧縮した中身への内容アドレスを持つ。Gitのpackfileに当たるものは無い。サーバーはSpannerとクラウドのストレージの上で動き、リポジトリの完全な写しはサーバーにも存在しない。チェックアウトはスパースか、ファイルを要るときだけ取り出す仮想化した形を基本とする[^anthropic-scion]。

記事は、ScionのCPUとメモリの使用量が以前のGitのミラーの200分の1になり、CIと研究のジョブのチェックアウトが分単位から秒単位に縮んだと述べている[^anthropic-scion]。マージキューについては、エージェントの規模ではリポジトリ全体のロックを取る従来の方式が成り立たないとし、マージ後とデプロイ前の自動テストに投資したと書いている[^anthropic-scion]。

先行例として、記事はGoogleのPiperとMetaのSaplingを挙げている。記事の注は、Saplingのサーバー側のMononokeがScionの使う手法の多くを先に実現しており、とくにBonsaiと呼ぶデータモデルがそうだと述べている[^anthropic-scion]。

Anthropicは、Scionを「一般の用途でgitの代わりになるものでは決してない」としている。数万人の技術者か大量のエージェントがコードを書く巨大なモノレポでしか意味を持たない設計だとして、公開はせず、考え方をGitHub・GitLab・オープンソースのコミュニティと共有するとした[^anthropic-scion]。

### Pando（OpenAI）

PandoはOpenAIが作った、Gitと互換のサーバー側の実装である。同社は2026年11月2日に「Scaling Git at OpenAI」と題する記事で公表した[^blockchain-pando][^alphasignal-pando]。この記事の時点で、SloppediaはOpenAIの元の記事を読めておらず、以下は報道による[^note-pando]。

報道によると、Pandoはモノレポの開発を既存のGitの使い方を変えずに支え、git push・fetch・cloneはそのまま使える[^blockchain-pando][^alphasignal-pando]。関係のない参照（ref）へのpushは互いに独立して進み、同じ参照の更新だけが比較と交換に似た不可分の操作で順番に並ぶ[^blockchain-pando]。読み出しは事前に作ったpackfileを使い、頻繁なpushで増えた小さなpackfileを、LSMツリーに似た方式で段階的に大きな「cover」にまとめる[^blockchain-pando][^alphasignal-pando]。

報道によると、OpenAIは中央値のpushの待ち時間が約80%縮み、1日に1ペタバイト近いGitのデータを少数のCPUコアで配っているという[^alphasignal-pando][^cryptobriefing-pando]。以前のバックエンドは、エージェントと人の同時の作業で信頼性が90%を下回っていたという[^alphasignal-pando]。Codexによるコミットが2024年第1四半期から2026年第3四半期までで1,378%増えたこと、約10週間で作って2026年4月から本番で動かしていることは、CryptoBriefingだけが伝えている[^cryptobriefing-pando]。

OpenAIは自社でビルドしたGitのクライアントを社内の開発機とChatGPTのデスクトップアプリに配り、並列のpackfileの処理などのGitへの修正を本家に送っているとされる[^alphasignal-pando]。ソースコードや外部向けの提供は無いと報じられている[^alphasignal-pando]。

### 2社の違い

| 項目           | Scion                              | Pando                                                |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| Gitとの関係    | 独自の形式と通信の手順。移行が要る | Gitの通信の手順と互換。クライアントはGitのまま       |
| 書き込みの扱い | サーバーがコミットとマージを作る   | 参照ごとに独立して受け付け、同じ参照だけを順に並べる |
| 読み出しの扱い | 欲しい木とブロブだけを1つずつ取る  | 事前に作ったpackfileを並列に取る                     |
| 公開           | しない。考え方を共有する           | 報道では無し                                         |

## Git互換のクライアントと実装

### Jujutsu

Jujutsu（コマンドは`jj`）は、マーティン・フォン・ツヴァイクベルクが2019年に個人の計画として始め、のちにGoogleでの仕事になったバージョン管理システムである。Rustで書かれ、Apache License 2.0で公開されている[^jj]。保存先にGitのリポジトリを使えるため、GitHubなどのGitのホスティングとそのまま併用できる[^jj]。

作業ディレクトリそのものをコミットとして扱うため、ステージングの段階が無い。すべての操作を操作ログに残し、どの操作も取り消せる。衝突はコミットの中にそのまま記録でき、解消を後に回せる。子孫のコミットは、親を書き換えると自動でリベースされる[^jj]。2026年10月7日に0.46.0が出ており、版はまだ1.0に達していない[^jj-crate]。

### Sapling

SaplingはMetaが社内で使い、2022年11月に公開したバージョン管理システムである。クライアントはMercurialから派生し、GitHubのGitのリポジトリを扱える。社内では、サーバーのMononokeと、ファイルを必要なときに取り出す仮想ファイルシステムのEdenFSと組み合わせて使う[^sapling]。積み重ねたコミットを1つずつのプルリクエストにする機能や、スマートログと呼ぶ履歴の表示を持つ。ライセンスはGPLv2である[^sapling]。2026年11月2日の日付のタグが出ており、版の番号に日付を入れる方式で頻繁に出している[^sapling-tags]。

### gitoxide

gitoxideは、セバスチャン・ティールが始めた、GitをRustだけで実装する計画である。ライブラリの`gix`と、コマンドラインの`gix`・`ein`からなり、MITとApache License 2.0の二重のライセンスで公開されている[^gitoxide]。2026年10月22日に、ライブラリの`gix`は0.90.0、コマンドラインのgitoxideは0.61.0が出た[^gitoxide-crate]。

### GitButler

GitButlerは、GitHubの共同創業者で『Pro Git』の著者のスコット・シャコンらが作る、Gitの上に作ったクライアントである。同じ作業ディレクトリで複数のブランチを同時に扱う「仮想ブランチ」と、積み重ねたブランチを扱う機能を持つ。デスクトップアプリはTauriとRustとSvelteで書かれ、2026年2月の0.19.0でほとんどの操作をコマンドラインからも使えるようになった[^gitbutler][^gitbutler-releases]。2026年4月に1,700万ドルのシリーズAの資金を集めたと報じられている[^pulse2-gitbutler]。2026年11月3日の時点で最新の安定版のタグは0.23.2である[^gitbutler-releases]。

## Gitとは別の形式の代替

### Pijul

Pijulは、ピエール＝エティエンヌ・ムニエが作る、パッチの理論に基づく分散型のバージョン管理システムである。履歴を状態の並びではなく、順番を入れ替えても結果が変わらないパッチの集まりとして持つ。このため、同じ変更をどの順で取り込んでも同じ結果になり、チェリーピックの後に衝突が繰り返されない。衝突は解消されるまで状態として残る[^pijul]。Rustで書かれ、GPLv2で公開されている。2026年10月30日に1.0.0-beta.26が出ており、1.0は2026年11月3日の時点でまだ出ていない[^pijul-crate]。

### Fossil

Fossilは、SQLiteの作者のD・リチャード・ヒップが2006年に作った分散型のバージョン管理システムである。リポジトリを1つのSQLiteのデータベースのファイルに入れ、バグ管理・wiki・フォーラム・Webの画面を1つの実行ファイルに同梱する。SQLite自身の開発に使われている[^fossil]。ライセンスはBSDの2条項のものである。最新のリリースは2026年3月11日の2.28である[^fossil-changes]。

### Mercurial

Mercurialは、マット・マコールが2005年に作った分散型のバージョン管理システムである。Gitと同じ年に、同じくLinuxカーネルの開発で使っていたBitKeeperの代わりとして生まれた。PythonとRustで書かれ、GPLv2以降のライセンスで公開されている[^mercurial]。Meta（当時のFacebook）がMercurialを大規模なモノレポに合わせて拡張したものが、のちのSaplingになった[^sapling]。公式のリリースの一覧にある最新は、2026年1月29日の7.2である[^mercurial]。

## 比較

| 名前      | 開発元      | Gitとの関係                     | 言語              | ライセンス      | 確認した最新のリリース          |
| --------- | ----------- | ------------------------------- | ----------------- | --------------- | ------------------------------- |
| Scion     | Anthropic   | 独自形式                        | 不明              | 非公開          | 社内のみ                        |
| Pando     | OpenAI      | Git互換のサーバー               | 不明              | 非公開          | 社内のみ                        |
| Jujutsu   | Google ほか | Gitを保存先に使う               | Rust              | Apache-2.0      | 0.46.0（2026年10月7日）         |
| Sapling   | Meta        | Gitを扱えるクライアント         | Rust・Python ほか | GPL-2.0         | 2026年11月2日のタグ             |
| gitoxide  | 有志        | Gitの実装                       | Rust              | MIT・Apache-2.0 | gix 0.90.0（2026年10月22日）    |
| GitButler | GitButler   | Gitの上に作ったクライアント     | Rust・TypeScript  | FSL             | 0.23.2                          |
| Pijul     | 有志        | 独自形式                        | Rust              | GPL-2.0         | 1.0.0-beta.26（2026年10月30日） |
| Fossil    | 有志        | 独自形式（Gitへの書き出しあり） | C                 | BSD-2-Clause    | 2.28（2026年3月11日）           |
| Mercurial | 有志        | 独自形式                        | Python・Rust      | GPL-2.0以降     | 7.2（2026年1月29日）            |

## 外部リンク

- [Redesigning source control at Anthropic](https://www.anthropic.com/research/redesigning-source-control)
- [Jujutsu（GitHub）](https://github.com/jj-vcs/jj)
- [Sapling](https://sapling-scm.com/)
- [gitoxide（GitHub）](https://github.com/GitoxideLabs/gitoxide)
- [GitButler](https://gitbutler.com/)
- [Pijul](https://pijul.org/)
- [Fossil](https://fossil-scm.org/)
- [Mercurial](https://www.mercurial-scm.org/)

[^note-pando]: OpenAIの記事「[Scaling Git at OpenAI](https://openai.com/index/scaling-git-at-openai/)」は、2026年11月3日の時点でSloppediaの取得の手段からは読めなかった。著者、Pandoの実装の言語、置き換えた以前の仕組みの名前は確認できていない。

[^anthropic-scion]: Anthropic「[Redesigning source control at Anthropic](https://www.anthropic.com/research/redesigning-source-control)」2026年10月13日公開、10月15日更新。2026年11月3日閲覧。

[^blockchain-pando]: James Ding「[OpenAI details Pando, a Git-compatible backend for Codex-scale development](https://blockchain.news/news/openai-details-pando-git-compatible-backend-for-codex-scale-development)」Blockchain.News、2026年11月3日。2026年11月3日閲覧。

[^alphasignal-pando]: 「[OpenAI's Pando Cuts Push Latency 80% Serving a Petabyte of Git Daily](https://alphasignal.ai/news/openai-s-pando-cuts-push-latency-80-serving-a-petabyte-of-git-daily)」AlphaSignal、2026年11月3日。2026年11月3日閲覧。

[^cryptobriefing-pando]: Diego Almada Lopez「[OpenAI's Pando cuts Git push latency by about 80% for its monorepo](https://cryptobriefing.com/openai-pando-git-backend-push-latency/)」Crypto Briefing、2026年11月2日。2026年11月3日閲覧。

[^jj]: 「[jj-vcs/jj](https://github.com/jj-vcs/jj)」GitHub。2026年11月3日閲覧。

[^jj-crate]: 「[jj-cli](https://crates.io/crates/jj-cli)」crates.io。2026年11月3日閲覧。

[^sapling]: 「[Sapling SCM](https://sapling-scm.com/)」。2026年11月3日閲覧。

[^sapling-tags]: 「[facebook/sapling のタグ](https://github.com/facebook/sapling/tags)」GitHub。2026年11月3日閲覧。

[^gitoxide]: 「[GitoxideLabs/gitoxide](https://github.com/GitoxideLabs/gitoxide)」GitHub。2026年11月3日閲覧。

[^gitoxide-crate]: 「[gix](https://crates.io/crates/gix)」「[gitoxide](https://crates.io/crates/gitoxide)」crates.io。2026年11月3日閲覧。

[^gitbutler]: 「[GitButler](https://gitbutler.com/)」。2026年11月3日閲覧。

[^gitbutler-releases]: 「[gitbutlerapp/gitbutler のリリース](https://github.com/gitbutlerapp/gitbutler/releases)」GitHub。2026年11月3日閲覧。

[^pulse2-gitbutler]: 「[GitButler: $17 Million Series A Raised…](https://pulse2.com/gitbutler-17-million-series-a-raised-to-build-next-generation-software-development-infrastructure-beyond-git/)」Pulse 2.0、2026年4月13日。2026年11月3日閲覧。

[^pijul]: 「[Pijul](https://pijul.org/)」。2026年11月3日閲覧。

[^pijul-crate]: 「[pijul](https://crates.io/crates/pijul)」crates.io。2026年11月3日閲覧。

[^fossil]: 「[Fossil](https://fossil-scm.org/)」。2026年11月3日閲覧。

[^fossil-changes]: 「[Change Log](https://fossil-scm.org/home/doc/trunk/www/changes.wiki)」Fossil。2026年11月3日閲覧。

[^mercurial]: 「[Mercurial SCM](https://www.mercurial-scm.org/)」。2026年11月3日閲覧。
