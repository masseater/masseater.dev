---
title: "モノレポの構造の可視化"
description: "モノレポの中のプロジェクトと、その間の依存を一覧や木や図として取り出すこと。2026年11月の時点で、Node.js と Rust と .NET をまたいで1つの図にまとめられる道具はまだ無い。"
tags: ["モノレポ", "開発ツール", "依存関係", "2026年のソフトウェア"]
published: true
infobox:
  - label: "対象"
    value: "モノレポの中のプロジェクト、タスク、ファイル"
  - label: "主な道具"
    value: "pnpm、Turborepo、Nx、moon、mise、Bazel、fallow"
  - label: "主な出力"
    value: "木、表、JSON、DOT、Mermaid、HTML"
  - label: "検証した日"
    value: "2026年11月9日"
  - label: "検証したリポジトリ"
    value: "masseater/masseater.dev"
    href: "https://github.com/masseater/masseater.dev"
---

モノレポの構造の可視化は、[モノレポ](/sloppedia/monorepo-and-polyrepo)の中にどんなプロジェクトがあり、どれがどれに依存しているかを取り出して見せることである。取り出した結果は、端末の木や表、JSON、DOT や Mermaid の図、ブラウザーで動かす対話的な画面などで示される。

モノレポが大きくなると、リポジトリの全体を人が頭の中に保てなくなる。可視化は、その代わりに構造を読める形で外に出す手段である。2026年には、人だけでなく AI のエージェントがリポジトリの構造を知る手段としても使われるようになった[^nx-mcp]。

この記事は、2026年11月9日に Sloppedia の持ち主の masseater が出した問いから生まれた。問いは「モノレポの中を構造化して見やすく表示してくれる道具が欲しい。pnpm の既存の機能だけでできるか」というものだった。続けて「作る価値があるかを調べて」と頼まれた。記事の後半は、そのときの実測と比較の記録である。

## 何を表示するか

モノレポの構造は、細かさの違ういくつかの層で表せる。どの層を表示するかで、使う道具が変わる。

| 層           | 点                   | 辺                         | 代表的な道具                      |
| ------------ | -------------------- | -------------------------- | --------------------------------- |
| プロジェクト | パッケージやクレート | マニフェストに書いた依存   | pnpm、Nx、moon、mise              |
| タスク       | ビルドやテストの手順 | 先に動かすべき手順         | Turborepo、Vite Task、moon        |
| ターゲット   | ビルドの成果物       | BUILD ファイルの依存の宣言 | Bazel                             |
| ファイル     | ソースファイル       | import の文                | fallow、dependency-cruiser、Madge |

プロジェクトの層は、マニフェストを読むだけで作れる。マニフェストとは、`package.json` や `Cargo.toml` のように、プロジェクトの名前と依存を書いたファイルである。タスクの層は、プロジェクトの層の上に「どの手順をどの順で動かすか」を重ねたものである。ファイルの層は、ソースコードを解析しなければ作れない。

人がリポジトリの見取り図として欲しがるのは、たいていプロジェクトの層である。変更の影響範囲を知りたいときや、CI で動かす範囲を決めたいときは、タスクやファイルの層が要る。

## 道具ごとの状況

Nx が運営する monorepo.tools の比較表には、プロジェクトのグラフの可視化という行がある[^monorepo-tools-compare]。表は、Bazel、moon、Lerna、Nx、Turborepo がこの機能を備えるとしている。Gradle、Lage、Pants、Rush は、利用者が自分で作る扱いである。比較表を作った Nx 自身が備える側に入っている点は、割り引いて読む必要がある。

### pnpm

[pnpm](/sloppedia/pnpm) は、Node.js のパッケージマネージャーで、ワークスペースの機能を持つ。2026年8月に出た 12.0 で Rust による書き直しが安定バージョンになった。2026年11月9日の時点の最新バージョンは、11月5日に出た 12.18.0 である[^pnpm-release]。

ワークスペースの構造を見る機能は、`pnpm list` に集まっている[^pnpm-list]。`-r` を付けると全プロジェクトを対象にし、`--only-projects` を付けるとワークスペースの中のプロジェクトへの依存だけを表示する。`--depth` に `-1` を渡すとプロジェクトの一覧だけを、大きな数を渡すと依存の木を出す。`--json` を付けると、同じ内容を JSON で出す。`--lockfile-only` を付けると、`node_modules` を作らずにロックファイルだけから答える。

逆向き、つまりあるパッケージに依存しているプロジェクトの一覧は、`--filter` の選択子で取る[^pnpm-filtering]。`pnpm -F '...名前' ls --depth -1` と書くと、その名前のパッケージと、それに依存する全プロジェクトが並ぶ。

pnpm には `pnpm why` という逆引きの命令もある[^pnpm-why]。ただし 12.18.0 で masseater.dev のワークスペースのパッケージを渡すと、何も表示しなかった。外部のパッケージの逆引き用と考えたほうがよい。

pnpm の機能で足りない点は3つある。1つ目は、図の形式で出せないことである。DOT や Mermaid の出力も、ブラウザーの画面も無い。2つ目は、Node.js のパッケージしか見ないことである。pnpm 12 は Cargo のクレートを取ってこられる。しかし `package.json` を持たないクレートは、ワークスペースのプロジェクトにならない。Cargo の `path` で書いた依存も、プロジェクトの間の辺にならない。3つ目は、タスクを見せないことである。

### Turborepo

Turborepo は、Vercel が作るモノレポのタスクランナーである。`turbo run` に `--graph` を付けると、実行するタスクのグラフを SVG、HTML、Mermaid、DOT のどれかで書き出す[^turbo-run]。JSON や PNG での出力は、3.0 で外す予定の形式として残っている。

2.x では、`turbo query` という GraphQL の問い合わせの口が加わった[^turbo-query]。パッケージの一覧や、各パッケージの直接の依存と依存元を、問い合わせ1つで取り出せる。引数を付けずに動かすと、GraphiQL の画面が立ち上がる。

Turborepo は、設定ファイルの `turbo.json` が無いと動かない。グラフの辺は `package.json` の依存から作るので、Cargo の依存は見えない。

### Nx

Nx は、同名の Nx 社が作るモノレポのビルドシステムである。`nx graph` は、プロジェクトのグラフをブラウザーの対話的な画面で見せる[^nx-graph]。プロジェクトを選んで絞り込んだり、フォルダーごとにまとめたりできる。`--file` に `.json` の名前を渡すとグラフを JSON で、`.html` の名前を渡すと持ち運べる HTML で書き出す。

Nx は pnpm のワークスペースを、`nx.json` が無くても読める。2026年11月9日に 24.0.5 で試したところ、設定を足さずにグラフが出た。ただし、先に `pnpm install` で `node_modules` を作っておかなければ、ロックファイルの読み取りで失敗する。

Rust や .NET を Nx のグラフに載せるには、プラグインを `nx.json` に足す。Rust は有志の `@monodon/rust`、.NET は公式の `@nx/dotnet` がある。

### moon

moon は、moonrepo が Rust で作るモノレポのビルドシステムである。`moon project-graph` はプロジェクトのグラフを、`moon task-graph` はタスクのグラフを、ブラウザーの対話的な画面で見せる[^moon-project-graph]。`--json` を付けると JSON で出す。

moon は言語ごとに対応の深さを段階で決めている[^moon-languages]。段階2では、マニフェストやロックファイルを読んで依存を推し量る。Node.js、Bun、Deno、Go、Rust がこの段階にある。Python と Ruby は試験的な扱いである。C# などのそのほかの言語は段階0で、依存は手で書くしかない。

moon は `.moon/` の下の設定ファイルを必要とする。プロジェクトの識別子は、既定ではフォルダーの名前から作る。masseater.dev では `apps/mosaic` と `libs/mosaic` の名前が重なり、そのままでは動かなかった。識別子をパスから作る設定に変えると、グラフが出た。

### mise

mise は、開発の道具のバージョンを管理する道具で、タスクランナーも兼ねる。モノレポの機能では、ワークスペースのマニフェストからプロジェクトのグラフを作る[^mise-graph]。Cargo、uv、Go、Gradle、Node.js の5つのマニフェストを読む。

Cargo では、ワークスペースの中を指す `path` の依存を辺にする。`workspace = true` と書いて `[workspace.dependencies]` から道を受け継ぐ依存も含む。Node.js では、依存の名前がワークスペースの中のパッケージの名前と一致すれば辺にする。

グラフは `mise tasks graph` で表を、`--json` で JSON を出す。`--explain` を付けると、各プロジェクトと各辺が、どの提供元のどのファイルから来たかを示す。`mise run --affected` は、このグラフを使って変更の影響を受けるプロジェクトを選ぶ。使うには、ルートの `mise.toml` に `monorepo_root = true` を書き、`[monorepo]` の `config_roots` にプロジェクトの場所を並べる。`config_roots` を省くとファイルシステムを歩いて探すが、この動きは非推奨で警告が出る。

2026年11月9日の検証で、Node.js と Cargo の辺を設定の追記だけで1つのグラフに入れられたのは、mise と moon の2つだった。mise も .NET は読まない。同じディレクトリが Cargo のクレートと Node.js のパッケージの両方なら、別々の2つの点として出る。

### Bazel と同類

[Bazel](/sloppedia/bazel) は、BUILD ファイルに宣言したターゲットの依存を、`bazel query` で問い合わせる[^bazel-query]。`--output graph` を付けると、結果を DOT で出す。言語を問わずすべての依存を BUILD ファイルに書くので、多言語のグラフが最初から1つにまとまっている。

その代わり、ビルドのすべてを Bazel の流儀で書き直す必要がある。Pants や Buck2 も同じ系統の道具である。

### Vite+ と Vite Task

[Vite+](/sloppedia/vite-plus) は、[VoidZero](/sloppedia/voidzero) が作るウェブ開発の道具一式で、`vp run` の中身は [Vite Task](/sloppedia/vite-task) である。2026年11月9日の時点の最新バージョンの vite-plus 1.5.0 には、グラフを表示する命令が無い。

`vp graph` という命令を求める提案は、2026年3月28日に出された[^vp-graph-issue]。対話的な画面、パッケージの絞り込み、影響範囲の表示、JSON の出力を求めている。メンテナーは、先に JSON の出力の RFC を書くことを提案した。10月12日には、有志が JSON を出す試作を報告した。提案はまだ閉じていない。

その RFC の流れから、Vite Task の側には動きがある。11月6日に、タスクのグラフを JSON で出す `vp run --json` がマージされた[^vite-task-json]。11月9日には、実行の計画を表示する `--dry-run` と、計画を JSON で出す `--dry-run --json` がマージされた[^vite-task-dry-run]。これらは vite-plus のまだ出ていない次のバージョンに入る見込みである。

Vite Task のグラフの点は、`package.json` を持つパッケージだけである。Cargo などの別のエコシステムのワークスペースを読む計画は、公開されていない。

### fallow

fallow は、TypeScript と JavaScript のコードを Rust で解析する道具である。使われていないコードや循環する依存を見つける。`fallow viz` は、コードベースの地図を1つの HTML に書き出す[^fallow-viz]。DOT や Mermaid でも出せる。

この地図の点はファイルで、フォルダーごとにまとめて描く。各ファイルの健全さの点数や指摘も重ねて表示する。プロジェクトの層の見取り図というより、TypeScript のコードの内部の地図である。`fallow workspaces` は、見つけたワークスペースを一覧にする。

### 言語の公式の道具

各言語の公式の道具も、自分のエコシステムの中の構造は出せる。Cargo の `cargo metadata` は、ワークスペースのクレートと依存を JSON で出す[^cargo-metadata]。.NET の `dotnet reference list` は、プロジェクトが参照するほかのプロジェクトを並べる[^dotnet-reference]。.NET 9 までは `dotnet list reference` という語順だった。どちらも、自分の言語の外のことは知らない。

## masseater.dev での実測

2026年11月9日に、masseater/masseater.dev のコミット `40258ae` で各道具を動かした。このリポジトリは TypeScript を中心に、Rust のクレートと、C# の Slay the Spire 2 の Mod を含む。pnpm のワークスペースのプロジェクトは、ルートを含めて53個ある。Cargo のワークスペースには4つのクレートがある。Rust のクレートのうち3つは、Vite Task から動かすために `package.json` も持つ。

計測はクラウドの Linux の環境で行った。時間は2回動かしたうちの2回目の値である。

| 道具と命令                          | バージョン | 追加の設定           | 点  | 辺  | Cargo の辺 | 時間   |
| ----------------------------------- | ---------- | -------------------- | --- | --- | ---------- | ------ |
| `pnpm -r ls --only-projects --json` | 12.18.0    | 不要                 | 53  | 79  | 無し       | 184 ms |
| `turbo query`                       | 2.11.10    | `turbo.json`         | 53  | 79  | 無し       | 103 ms |
| `nx graph --file`                   | 24.0.5     | 不要（要 install）   | 52  | 78  | 無し       | 814 ms |
| `moon project-graph --json`         | 2.6.5      | `.moon/` の2ファイル | 55  | 79  | 有り       | 253 ms |
| `mise tasks graph --json`           | 2026.11.5  | `monorepo_root`      | 57  | 80  | 有り       | 82 ms  |
| `cargo metadata --no-deps`          | 1.99.1     | 不要                 | 4   | 1   | 有り       | 64 ms  |

辺の数の差の大半は、ルートのプロジェクトの扱いの違いである。pnpm はルートからの辺を数え、Nx はルートを点にしない。Turborepo は、すべてのパッケージがルートに依存するという暗黙の辺を足す。表の Turborepo の値は、その暗黙の辺を除いた数である。

Cargo の辺は、ここでは `pod_rattle` から `pod-rattle-engine` への1本だけである。この辺は `Cargo.toml` にしか書かれていない。これを拾えたのは、moon、mise、`cargo metadata` の3つだけだった。

moon は、`apps/aredoko-desktop/src-tauri` にある Tauri のクレートを見落とした。プロジェクトのルートを `apps/*` の深さで決めたため、一段深い `Cargo.toml` を読まなかった。mise は、このクレートを独立した点として出した。

C# の Mod の `.csproj` は、どの道具の点にもならなかった。masseater.dev の C# のプロジェクトは、今のところ互いを `ProjectReference` で参照していない。そのため失われた辺は無い。それでも、C# のプロジェクトがリポジトリにあること自体が、どのグラフからも読み取れない。

## AI から読む経路

AI のエージェントがリポジトリの構造を知る経路は、2026年には2つに分かれている。1つは [Model Context Protocol](/sloppedia/model-context-protocol) のサーバーを通す経路である。もう1つは、命令の JSON の出力を直接読ませる経路である。

Nx は `nx mcp` で MCP のサーバーを立てる[^nx-mcp]。`nx_workspace` というツールが、プロジェクトのグラフを読みやすい形で返す。ただし既定の最小の構成では、このツールは隠れている。Nx の文書は、エージェントには MCP より `nx show projects` のような命令を使わせるほうが、消費するトークンが少ないと勧めている。

moon も `moon mcp` で MCP のサーバーを立てる[^moon-mcp]。Turborepo の `turbo query` は GraphQL なので、エージェントが必要な項目だけを選んで問い合わせられる。

Nx の勧めが示すとおり、エージェントにとっては、図よりも JSON のほうが役に立つ。図は人が全体を眺めるためのものである。エージェントは、問いに合わせて必要な部分を JSON から取り出せばよい。この点で、`pnpm list --json` や `mise tasks graph --json` のような素直な JSON の出力は、それだけで AI 向けの可視化として働く。

## 作る価値の検討

### 構想

Sloppedia の持ち主の masseater は、TypeScript と Rust をつなぎ目なく扱える、自分専用のモノレポ管理の道具を構想している。設定は `vite.config.ts` の1つにまとめる。目的は、AI がリポジトリのすべての計測を自分で引ける場所を作ることである。Vite Task をフォークし、pnpm と `cargo metadata` からワークスペースのグラフを作る提供元を足す案が出ている。

masseater は、汎用性より自分の使い方への特化を選ぶと述べている。他人の OSS の更新を待たず、気になったらすぐ直せることを重んじる。Cloudflare、Claude、Vite+ への依存は前提にしてよいとしている。

### 既存の道具で埋まる部分

2026年11月9日の比較では、構造を表示する道具を単独で新しく作る価値は小さいという結論になった。理由は次の3つである。

1つ目に、多言語のプロジェクトのグラフは mise がすでに作れる。masseater.dev は道具のバージョンの管理に mise を使っており、設定を数行足せばグラフが出る。Cargo の辺も拾い、どの辺がどのファイルから来たかも説明できる。

2つ目に、タスクのグラフは Vite+ の次のバージョンの `vp run --json` で出る見込みである。`vite.config.ts` に書いたタスクと `dependsOn` が、そのまま JSON になる。

3つ目に、見た目のよい対話的な画面は Nx の `nx graph` が設定なしで出せる。人が全体を一度眺めたいだけなら、これで足りる。

### 既存の道具で埋まらない部分

残る隙間は次の3つである。

1つ目は、エコシステムをまたいだ点の統合である。同じディレクトリにある Node.js のパッケージと Rust のクレートは、どの道具でも別々の点になるか、片方しか見えない。masseater.dev のように、Rust のクレートに Vite Task 用の `package.json` を添える構成では、これが2重の点として表れる。

2つ目は、.NET である。moon は C# を段階0に置き、mise は .NET の提供元を持たない。Nx は公式のプラグインを持つが、`nx.json` が要る。

3つ目は、プロジェクトとタスクとファイルの層を1枚に重ねる表示である。各層を出す道具は別々にあり、それぞれの JSON の形も違う。

### 結論

この3つの隙間は、どれも表示の問題ではなく、グラフをどう組み立てるかの問題である。描画の部分は、Mermaid や DOT に流すだけで済む。価値が残るのは、複数のエコシステムのグラフをディレクトリで突き合わせ、1つに束ねる層である。

この層は、masseater の構想にある「ワークスペースの提供元を足した Vite Task のフォーク」で作る予定の部分と重なる。したがって、構造の表示のための独立した道具を別に作るより、構想の道具の最初の機能としてこの層を作るのが妥当である。そのときも、マニフェストを自分で読み直す必要は無い。`mise tasks graph --json`、`cargo metadata`、`vp run --json` を入力として受け取り、束ねるだけでよい。

構想の道具ができるまでの間は、mise のグラフで多言語のプロジェクトの層を、`nx graph` で人向けの図を補える。

## 関連項目

- [モノレポとポリレポ](/sloppedia/monorepo-and-polyrepo)
- [Vite Task](/sloppedia/vite-task)
- [Vite+](/sloppedia/vite-plus)
- [Blaze と Bazel](/sloppedia/bazel)

[^pnpm-release]: pnpm「[v12.18.0](https://github.com/pnpm/pnpm/releases/tag/v12.18.0)」GitHub、2026年11月5日。

[^pnpm-list]: pnpm「[pnpm list](https://pnpm.io/cli/list)」。2026年11月9日に閲覧。

[^pnpm-filtering]: pnpm「[Filtering](https://pnpm.io/filtering)」。2026年11月9日に閲覧。

[^pnpm-why]: pnpm「[pnpm why](https://pnpm.io/cli/why)」。2026年11月9日に閲覧。

[^turbo-run]: Turborepo「[run](https://turborepo.dev/docs/reference/run)」。2026年11月9日に閲覧。

[^turbo-query]: Turborepo「[query](https://turborepo.dev/docs/reference/query)」。2026年11月9日に閲覧。

[^nx-graph]: Nx「[Nx Commands](https://nx.dev/docs/reference/nx-commands)」。2026年11月9日に閲覧。

[^nx-mcp]: Nx「[Nx MCP](https://nx.dev/docs/reference/nx-mcp)」。2026年11月9日に閲覧。

[^monorepo-tools-compare]: Nx「[Compare Monorepo Tools](https://monorepo.tools/compare)」monorepo.tools。2026年11月9日に閲覧。

[^moon-project-graph]: moon「[Project graph](https://moonrepo.dev/docs/how-it-works/project-graph)」。2026年11月9日に閲覧。

[^moon-languages]: moon「[Languages](https://moonrepo.dev/docs/how-it-works/languages)」。2026年11月9日に閲覧。

[^moon-mcp]: moon「[mcp](https://moonrepo.dev/docs/commands/mcp)」。2026年11月9日に閲覧。

[^mise-graph]: mise「[Workspace graph](https://mise.jdx.dev/tasks/workspace-graph.html)」。2026年11月9日に閲覧。

[^bazel-query]: Bazel「[Query guide](https://bazel.build/query/guide)」。2026年11月9日に閲覧。

[^vp-graph-issue]: alvarosabu「[Dependency graph visualization for monorepos (like nx graph)](https://github.com/voidzero-dev/vite-plus/issues/1182)」voidzero-dev/vite-plus #1182、2026年3月28日。

[^vite-task-json]: 「[feat(run): print the task graph as JSON with vp run --json](https://github.com/voidzero-dev/vite-task/pull/948)」voidzero-dev/vite-task #948、2026年11月6日にマージ。

[^vite-task-dry-run]: 「[feat(run): print the run plan as JSON with vp run --dry-run --json](https://github.com/voidzero-dev/vite-task/pull/966)」voidzero-dev/vite-task #966、2026年11月9日にマージ。

[^fallow-viz]: fallow「[viz](https://fallow.tools/docs/cli/viz)」。2026年11月9日に閲覧。

[^cargo-metadata]: The Cargo Book「[cargo metadata](https://doc.rust-lang.org/cargo/commands/cargo-metadata.html)」。2026年11月9日に閲覧。

[^dotnet-reference]: Microsoft「[dotnet reference list command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-reference-list)」。2026年11月9日に閲覧。
