---
title: "既存ツールの再構築" description: "Markdownlintのy8、ActionlintとZizmorのfu4、シークレットスキャナーのh56m、リポジトリルールのmschなど、既に存在するリンターやチェッカーをClaudeに再構築させている。自前で管理することで、気になる点を一度に修正でき、あらゆる設定や計測値を一箇所にまとめて管理できる。" tags: ["Linter", "Rust", "Vite+", "Claude"] published: true
---

Claudeに、既に存在してうまく動作しているツールを次々と作り直させている。y8はmarkdownlintの代わりにMarkdown linter、fu4はactionlintの代わりにGitHub Actions linter、zizmorはBetterleaksとsecretlintの代わりにh56mがシークレットスキャナー、そしてmschは私の全リポジトリのチェックを一つのコマンドにまとめてくれる。11月7日、その理由をこう記した。「他人のOSSアップデートフローに縛られたくない。すべて自分で作り、何か気になることがあればすぐに直したい」。私が欲しいのは、AIがあらゆる計測を自力で行える場所であり、借り物のツールがその邪魔をし続けることだ。

| Tool                                                                   | Replaces                                           | Built on                                    | Gives the same results as                   |
| ---------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| [y8](https://github.com/masseater/masseater.dev/tree/main/libs/y8)     | markdownlint, rumdl                                | pulldown-cmark                              | markdownlint MD001 to MD060                 |
| [fu4](https://github.com/masseater/masseater.dev/tree/main/libs/fu4)   | actionlint, zizmor                                 | zizmor's published crates, tree-sitter-bash | actionlint and zizmor's offline audits      |
| [h56m](https://github.com/masseater/masseater.dev/tree/main/libs/h56m) | Betterleaks, secretlint                            | Kingfisher's matching engine                | Betterleaks rules, read in their own format |
| [msch](https://github.com/masseater/masseater.dev/tree/main/libs/msch) | per-repository scripts and rules written in skills | the tools above and oxlint                  | none; the rules are mine                    |

## ライブラリに合わせてコードを曲げる方が、書くよりもコストがかかる。

私のルールは相変わらず、理由なくビルドやラップはせず、新しいものを書く前に既存のライブラリを探すことだ。11月15日、ひとつ例外を追加した。「汎用ライブラリを汎用的な用途に無理に当てはめて効率が落ちるなら本末転倒なので、自分のユースケースに合わせた独自のライブラリを自作することを自分に許している」。

コストについては、置き換えたすべてのツールで顕在化した。Markdownlint、ActionLint、BetterLeaksはそれぞれ独自のフォーマットで設定ファイルを読み込んでいたが、リポジトリ内の他のすべての設定は単一の `vite.config.ts` に収まっていた。ActionLintはGoバイナリとして提供されているため、呼び出し元のTypeScriptと同じトレースにスパンを報告することができない。GitHubがリポジトリ自体を参照する `uses: $/path` 構文を追加した際、ActionLint 1.7.12はこれを拒否し、私側での唯一の対処法はリリースを待つか、この構文の使用を止めることだった。

## 元のツールのテストが仕様となる。

Claudeがコードを記述し、元のツールがすでに「正しい」の意味を定義しているため、リビルドは今や低コストで実現できる。ここでのすべてのツールは、置き換え対象となるツールのテストデータをベンダーに提供しており、リリース前に同一の回答を提示しなければならない。y8は、436個のフィクスチャにおいてMarkdownlint 0.42.1の全53ルールに一致している。fu4はactionlintの指摘事項を同一のメッセージと位置で報告しており、またzizmorの43件のセキュリティ監査の移植版は、zizmor 1.32.0の全278件のスナップショットケースと一致している。

元の1つ目と一致させ、2つ目を変更することで、変更内容を意図した形に保てる。fu4がactionlintと異なる点は、私が選択した一点にある。それは、ワークフローで使用している `uses: $/path` を受け付けることだ。y8は速度が異なる。私のモノレポにある267個のMarkdownファイルにおいて、y8のリント処理時間は28 msであるのに対し、rumdlは70 msかかる。rumdlはすでにmarkdownlintをRustで書き直したものである。

## コアを借りて、サーフェスを構築する。

仕様に準拠したパーサーやマッチングエンジンを再構築することはない。y8はpulldown-cmarkでパースし、fu4はzizmor自身のクレートでzizmorの監査を実行し、h56mはKingfisherのエンジンでシークレットを照合する。私がビルドするのは、実際に手を加える部分、つまり `vite.config.ts` の設定セクション、コマンド、診断、スパン、およびルールである。

ルールは同様にエンジンから分割される。各エンジンはOSごとにビルドされるRustパッケージであり、そのルールは `<engine>-presets` という1つのTypeScriptパッケージとして提供され、そこからリポジトリが対象ごとにプリセットを選択する。エンジンは構文木を共有メモリ経由でTypeScriptルールに渡し、計測値によってTypeScriptが遅すぎると判断された場合にのみ、ルールがRustに移行する。

## mschは私の修正内容をチェックに変換する。

mschは、これらのツールが自身のルールと合致する場所だ。リポジトリのあらゆるチェックを単一のコマンドで実行し、すべてのプッシュで実行される `vp run verify` の一部となっている。コードを説明するコメントや、引数を転送するだけのラッパー関数など、Claudeが同じミスを2回修正した場合、その修正はスキル内の一文ではなく、mschチェックとなる。それ以来、Claudeはルールを、スキップしてよいテキストではなく、失敗時のチェックとして認識するようになった。

mschが実行するすべてのツールを自分が管理しているため、新しいチェックが他を待機することはない。y8やfu4でルールの修正が必要になった際、同じスレッドが1つのPRでツールとリポジトリを変更する。
