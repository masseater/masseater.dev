---
title: "mizchi の GitHub 活動（2025年1月〜2026年11月）"
description: "フロントエンドエンジニアの mizchi が、2025年1月から2026年11月10日までに GitHub で公開した活動の記録。コミット約2万2千件、PR 4,456件、新しいリポジトリ222個の大半は MoonBit と AI エージェントによる開発に向かった。"
tags:
  ["2026年のソフトウェア", "GitHub", "MoonBit", "大規模言語モデル", "オープンソースソフトウェア"]
published: true
infobox:
  - label: "対象"
    value: "mizchi（Kotaro Chikuba）"
    href: "https://github.com/mizchi"
  - label: "期間"
    value: "2025年1月1日〜2026年11月10日"
  - label: "コミット"
    value: "21,648件（252リポジトリ）"
  - label: "プルリクエスト"
    value: "4,456件（うち他人のリポジトリ 393件）"
  - label: "issue"
    value: "2,382件"
  - label: "新しい公開リポジトリ"
    value: "222個（うち MoonBit 105個）"
  - label: "最もスターの多いリポジトリ"
    value: "similarity（845）"
  - label: "所属組織"
    value: "bit-vcs"
---

mizchi の GitHub 活動は、[mizchi](/sloppedia/mizchi) が2025年1月から2026年11月10日までに GitHub の公開リポジトリで行ったコミットやプルリクエストなどの記録である。mizchi は東京のフロントエンドエンジニアで、プロフィールには「Virtual DOM Enthusiast」と書いている[^profile]。

この期間のコミットは21,648件、プルリクエストは4,456件、issue は2,382件にのぼる[^search-commits][^search-issues]。2025年の前半は月に数十件のコミットにとどまっていた。2025年6月に AI のためのコード解析ツールを出してから増え始めた。2025年12月から2026年2月までは、[MoonBit](/sloppedia/moonbit) を中心に毎月15個から40個の公開リポジトリを作った[^search-repos]。2026年のコミットの4割あまりには、[Claude Code](/sloppedia/claude-code) と共に書いた印が付いている[^co-authored]。

## 月ごとの件数

GitHub の検索 API で、作者が mizchi のコミット・プルリクエスト・issue を月ごとに数えた[^search-commits][^search-issues]。新しいリポジトリは、2026年11月10日の時点で残っている公開リポジトリを作った月で数えた[^search-repos]。

| 月                     | コミット | プルリクエスト | issue | 新しいリポジトリ |
| ---------------------- | -------: | -------------: | ----: | ---------------: |
| 2025年1月              |       20 |              0 |     0 |                3 |
| 2025年2月              |       63 |              0 |     0 |                6 |
| 2025年3月              |       29 |              2 |     1 |                1 |
| 2025年4月              |       50 |              0 |     0 |                4 |
| 2025年5月              |       43 |              2 |     2 |                4 |
| 2025年6月              |      614 |             19 |    15 |               10 |
| 2025年7月              |      368 |              6 |     3 |               12 |
| 2025年8月              |      381 |              0 |     4 |                6 |
| 2025年9月              |      189 |              0 |     0 |                4 |
| 2025年10月             |       41 |              3 |     1 |                1 |
| 2025年11月             |      786 |              1 |     3 |                1 |
| 2025年12月             |    1,581 |              5 |     6 |               15 |
| 2026年1月              |    1,410 |             36 |    14 |               35 |
| 2026年2月              |    2,039 |             57 |     7 |               40 |
| 2026年3月              |    2,612 |             79 |   127 |               15 |
| 2026年4月              |    1,345 |            270 |   155 |               12 |
| 2026年5月              |    2,875 |            709 |   311 |                9 |
| 2026年6月              |    1,187 |            489 |   133 |                4 |
| 2026年7月              |      765 |            499 |   295 |               10 |
| 2026年8月              |    2,381 |            848 |   549 |                5 |
| 2026年9月              |    1,877 |            737 |   434 |               17 |
| 2026年10月             |      542 |            326 |   216 |                5 |
| 2026年11月（10日まで） |      450 |            368 |   106 |                3 |

コミットが多い月は、ひとつのリポジトリに集中している。2025年11月の786件のうち774件は npm_typed.mbt で、2026年3月の2,612件のうち1,042件は vibe-lang だった[^search-commits]。プルリクエストが急に増えた2026年4月以降は、ほぼすべてを自分のリポジトリに出し、自分でマージしている。自分のリポジトリへの4,063件のうち3,918件がマージされた[^search-issues]。

新しいリポジトリ222個を言語で分けると、MoonBit が105個、TypeScript が57個、Rust と JavaScript が12個ずつだった[^search-repos]。期間内に作ったリポジトリが集めたスターは、2026年11月10日の時点で合わせて6,117である。

## 時期ごとの活動

### 2025年1月〜5月：Deno と AI のルール

2025年の初めは、Deno のプロジェクトで AI のコーディングエージェントに守らせるルールを試していた。2月に作った [ailab](https://github.com/mizchi/ailab) は、Cline や Roo Code に読ませる `.clinerules` と `.roomodes` を主な成果物にした実験場である[^ailab]。同じ月の deno-ai-bestpractice も、Deno のモジュール設計の規約を `.clinerules` にまとめている。

3月には [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) に Node.js の組み込み SQLite を使うドライバーを足すプルリクエストを出した。これはマージされずに残っている[^drizzle]。

### 2025年6月〜9月：AI のためのコード解析ツール

2025年6月に、AI エージェントにコードを読ませるための道具を立て続けに公開した。6月8日の [lsmcp](https://github.com/mizchi/lsmcp) は、言語サーバーの機能を MCP のツールとしてエージェントに渡す[^lsmcp]。6月16日の [similarity](https://github.com/mizchi/similarity) は、構文木を比べて重複した関数を見つける Rust 製のツールで、出力を AI に渡して直させる使い方を README で勧めている[^similarity]。similarity は期間内に作ったリポジトリで最も多い845のスターを集めた。

同じ時期には、Debug Adapter Protocol を MCP にする debugger-mcp や、Claude Code を Discord から動かす [ccdiscord](https://github.com/mizchi/ccdiscord) も作った。7月の [ai-coding-guide-202507](https://github.com/mizchi/ai-coding-guide-202507) は、Claude Code と Cline を使う練習の題材を集めたものである[^ai-coding-guide]。

他人のリポジトリでは、6月30日に [difit](https://github.com/yoshiko-pg/difit) へ TUI を足すプルリクエストを出し、マージされた[^difit]。9月には moonbit_jsonschema を作り、MoonBit に触れ始めた。

### 2025年10月〜2026年2月：MoonBit への移行

2025年10月の [js.mbt](https://github.com/mizchi/js.mbt) から、MoonBit のライブラリ作りが活動の中心になった。js.mbt は MoonBit から JavaScript の API を呼ぶための束縛で、のちに9つのモジュールに分けた[^js-mbt]。11月はその姉妹の npm_typed.mbt に774件をコミットしている。

12月に作った [luna.mbt](https://github.com/mizchi/luna.mbt) は、MoonBit の UI ライブラリと SSR・SSG のフレームワークを集めたモノレポである[^luna]。12月にはほかに、変更した箇所だけを解析し直す Markdown のパーサー [markdown.mbt](https://github.com/mizchi/markdown.mbt) も出した[^markdown-mbt]。同じ月、[Shiki](https://github.com/shikijs/textmate-grammars-themes) に MoonBit の文法を足すプルリクエストがマージされた[^shiki]。

2026年1月には35個、2月には40個の公開リポジトリを作った。1月の [crater](https://github.com/mizchi/crater) は、Playwright から WebDriver BiDi で操作できる MoonBit 製の軽いヘッドレスブラウザーである[^crater]。ほかに TypeScript と MoonBit をつなぐ型の生成器 ts.mbt や、Hono に倣った HTTP フレームワーク mars.mbt も作った。dotfiles を Nix と chezmoi で管理する [chezmoi-dotfiles](https://github.com/mizchi/chezmoi-dotfiles) もこの月に公開し、609のスターを集めた[^dotfiles]。

2月には、Ebiten に倣った MoonBit のゲームエンジン [kagura](https://github.com/mizchi/kagura) と、言語 vibe の今のリポジトリを作った[^kagura]。Claude Code に実装させて Codex にレビューさせる多エージェントの開発ツール [tornado](https://github.com/mizchi/tornado) もこの月である[^tornado]。

1月末からは、MoonBit で Git を実装する [bit](https://github.com/bit-vcs/bit) を組織 bit-vcs で開発している[^bit]。期間内に bit へ145件のプルリクエストを出し、141件がマージされた[^search-issues]。2月には `bit status` の走査を索引で導いて1,860ミリ秒から9ミリ秒にした[^bit-status]。

### 2026年3月〜6月：テストと CI の道具

2026年3月12日の [actrun](https://github.com/mizchi/actrun) は、GitHub Actions のワークフローを手元で動かす MoonBit 製のランナーである[^actrun]。673のスターを集め、プロフィールで唯一ピン留めしている[^profile]。リリースは9月18日の v0.32.0 まで続いた[^releases]。

同じ時期には、テストと検証の道具を多く作った。1月の [chaosbringer](https://github.com/mizchi/chaosbringer) は Playwright のテストに障害を注入する道具で、3月の [vlmkit](https://github.com/mizchi/vlmkit) は画面の崩れを決定的な検査で見つける道具である[^chaosbringer][^vlmkit]。4月の [flaker](https://github.com/mizchi/flaker) は、変更と履歴から手元で動かすテストを選び、不安定なテストを見つける[^flaker]。

4月24日には、自作のエージェントスキルを Microsoft の APM で配る [skills](https://github.com/mizchi/skills) を公開した[^skills]。5月には Pkl で設定するタスクランナー [pkfire](https://github.com/mizchi/pkfire) と、Kubernetes のマニフェストを Cloudflare に当てる k1c を作った[^pkfire][^k1c]。k1c と並行して、Go 製の AWS のエミュレーター [kumo](https://github.com/sivchari/kumo) に5月だけで79件のプルリクエストを出している[^search-issues]。

5月23日からは [MoonBit の標準ライブラリ](https://github.com/moonbitlang/core) の高速化に取り組んだ。JSON の字句解析やハッシュ表、SIMD による文字列処理などの改善を期間内に76件出し、51件がマージされた[^moonbit-core]。6月には、リポジトリの構造を地図のように描く [sprawlens](https://github.com/mizchi/sprawlens) を作った。

### 2026年7月〜11月：vibe と形式手法

2026年7月以降の活動の中心は、自作の言語 [vibe](https://github.com/mizchi/vibe-lang) である。vibe は副作用を型に表す小さな関数型言語である。コンパイラーは vibe 自身で書かれている[^vibe]。最初のコンパイラーは MoonBit 製だったが、6月23日のプルリクエストがその実装を退け、自己ホストだけにした[^vibe-594]。設計の方針には、LLM が書いて直すループに向けた型と診断を掲げている[^vibe]。

vibe のリポジトリには期間内に2,371件のプルリクエストと1,697件の issue を作り、8月だけでプルリクエストは713件だった[^search-issues]。9月下旬から v0.1.0 のリリース候補を出し、10月からはコンパイラーの種を「seed」のタグで出している[^releases]。

ほかに形式手法の試みも増えた。7月の dspec は型付きの形式モデルを仕様の正本にする道具で、8月の [uneffect](https://github.com/mizchi/uneffect) は既存の TypeScript に副作用と契約の検査を足す[^dspec][^uneffect]。uneffect には8月と9月で1,210件をコミットした[^search-commits]。

9月には TypeSafe AI のモデル Jev を使う道具を並べた。[jev-lint](https://github.com/mizchi/jev-lint) は、構文解析では決められない規則を Jev に確率で判定させる lint である[^jev-lint]。jev-test-filter は差分から動かすべきテストを Jev に選ばせる。9月24日には、AI が書いた内容を人に説明するスキル集 [explainer](https://github.com/mizchi/explainer) を出し、465のスターを集めた[^explainer]。

8月には [Oxc](/sloppedia/oxc) のミニファイアーの誤りを直すプルリクエストを7件出し、4件がマージされた[^oxc]。10月には、Vite で作るアプリを Cloudflare Workers に載せる VoidZero の Void で、Solid のアイランドを再水和するときの不具合を直した[^void]。10月の mutator は Vitest の変異テストを差分だけで回す道具である。11月には、WAT を拡張して Wasm GC 向けにした言語 Walz と、Web Components を出力する UI の言語 Isle を作った[^walz][^isle]。

## 他人のリポジトリへの貢献

他人のリポジトリへ出したプルリクエストは393件で、そのうち312件がマージされた[^search-issues]。件数の多い順は次のとおりである。

| リポジトリ               | プルリクエスト | 中身                                     |
| ------------------------ | -------------: | ---------------------------------------- |
| bit-vcs/bit              |            145 | MoonBit 製の Git の実装                  |
| sivchari/kumo            |             84 | AWS の API の実装                        |
| moonbitlang/core         |             76 | 標準ライブラリの高速化                   |
| ubugeeei-prod/vapor-moon |             10 | luna.mbt 向けの Vue 風の単一ファイル部品 |
| moonbitlang/async        |              8 | 非同期ランタイムの高速化                 |
| oxc-project/oxc          |              7 | ミニファイアーの修正                     |
| moonbitlang/x            |              6 | 拡張ライブラリの高速化                   |

ほかに、言語の Wado や Bend、Lean 4 などにもプルリクエストを出している。issue は、MoonBit のコンパイラーの不具合や、Wasmtime と wit-bindgen の食い違い、Taffy のレイアウトの不具合などを報告した[^search-issues]。

一方で、他人のプルリクエストへのレビューやコメントはほとんど無い。作者でないプルリクエストにコメントしたのは5件、issue へのコメントは13件だった[^search-comments]。活動のほぼすべては、自分で書いて出すことに向いている。

## AI エージェントとの開発

期間内のコミットのうち、メッセージに「Co-Authored-By: Claude」を含むものは検索で10,990件あった[^co-authored]。重複を除く前の23,306件の47%にあたる。2026年に限ると17,731件のうち7,750件だった。Claude Code が付ける「Generated with Claude Code」を含むものは3,519件である。2026年3月〜7月には、題名が「[codex]」で始まる Codex のプルリクエストも52件ある[^search-issues]。

コミットの時刻を日本時間で数えると、最も多いのは23時の1,677件で、0時の1,613件が続く[^search-commits]。最も少ないのは6時の139件で、4時から8時までは少ない。

## 調べ方と限界

数は、2026年11月10日に GitHub の検索 API で取った。コミットは search/commits、プルリクエストと issue は search/issues で、作者を mizchi にして日付で区切った[^search-commits][^search-issues]。検索の結果からは同じコミットの重複を除いた。

検索 API は、公開リポジトリの既定のブランチにあるコミットしか数えない。非公開のリポジトリと消したリポジトリは含まれない。他人のリポジトリに写されたコミットも混じっている。リポジトリの数は、今も残る公開リポジトリだけを数えた。プロフィールには公開リポジトリが693個とある[^profile]。

スターを付けた先は日付が取れないので数えていない。リリースは主なリポジトリのリリースの一覧だけを見た[^releases]。

[^profile]: mizchi「[mizchi (Kotaro Chikuba)](https://github.com/mizchi)」GitHub。2026年11月10日に閲覧。

[^search-commits]: GitHub の検索 API の search/commits を `author:mizchi` と作者の日付の範囲で引いた結果。検索の結果は23,306件で、重複を除くと21,648件。2026年11月10日に取得。同じ条件の[検索画面](https://github.com/search?q=author%3Amizchi+author-date%3A2025-01-01..2026-11-10&type=commits)。

[^search-issues]: GitHub の検索 API の search/issues を、作成日の範囲に `author:mizchi type:pr` または `author:mizchi type:issue` を足して引いた結果。2026年11月10日に取得。同じ条件の[プルリクエストの検索画面](https://github.com/search?q=author%3Amizchi+type%3Apr+created%3A2025-01-01..2026-11-10&type=pullrequests)。

[^search-repos]: GitHub の検索 API の search/repositories を `user:mizchi created:2025-01-01..2026-11-10` で引いた結果。2026年11月10日に取得。

[^search-comments]: GitHub の検索 API の search/issues を `commenter:mizchi -author:mizchi -user:mizchi` で引いた結果。2026年11月10日に取得。

[^co-authored]: GitHub の検索 API の search/commits を、期間の条件に「Co-Authored-By: Claude」と「Generated with Claude Code」の語句を足して引いた件数。2026年11月10日に取得。

[^ailab]: mizchi「[ailab](https://github.com/mizchi/ailab)」README。2026年11月10日に閲覧。

[^drizzle]: mizchi「[Add drizzle-orm/node-sqlite for node:sqlite support](https://github.com/drizzle-team/drizzle-orm/pull/4346)」drizzle-orm #4346、2025年3月31日。

[^lsmcp]: mizchi「[lsmcp](https://github.com/mizchi/lsmcp)」README。2026年11月10日に閲覧。

[^similarity]: mizchi「[similarity](https://github.com/mizchi/similarity)」README。2026年11月10日に閲覧。

[^ai-coding-guide]: mizchi「[ai-coding-guide-202507](https://github.com/mizchi/ai-coding-guide-202507)」README。2026年11月10日に閲覧。

[^difit]: mizchi「[TUI](https://github.com/yoshiko-pg/difit/pull/2)」difit #2、2025年6月30日。

[^js-mbt]: mizchi「[js.mbt](https://github.com/mizchi/js.mbt)」README。2026年11月10日に閲覧。

[^luna]: mizchi「[luna.mbt](https://github.com/mizchi/luna.mbt)」README。2026年11月10日に閲覧。

[^markdown-mbt]: mizchi「[markdown.mbt](https://github.com/mizchi/markdown.mbt)」README。2026年11月10日に閲覧。

[^shiki]: mizchi「[feat: add MoonBit language grammar](https://github.com/shikijs/textmate-grammars-themes/pull/169)」textmate-grammars-themes #169、2025年12月18日。

[^crater]: mizchi「[crater](https://github.com/mizchi/crater)」README。2026年11月10日に閲覧。

[^dotfiles]: mizchi「[chezmoi-dotfiles](https://github.com/mizchi/chezmoi-dotfiles)」README。2026年11月10日に閲覧。

[^kagura]: mizchi「[kagura](https://github.com/mizchi/kagura)」README。2026年11月10日に閲覧。

[^tornado]: mizchi「[tornado](https://github.com/mizchi/tornado)」README。2026年11月10日に閲覧。

[^bit]: bit-vcs「[bit](https://github.com/bit-vcs/bit)」README。2026年11月10日に閲覧。

[^bit-status]: mizchi「[feat: index-guided walk for bit status (1860ms → 9ms)](https://github.com/bit-vcs/bit/pull/11)」bit #11、2026年2月23日。

[^actrun]: mizchi「[actrun](https://github.com/mizchi/actrun)」README。2026年11月10日に閲覧。

[^releases]: GitHub のリリースの一覧。[actrun](https://github.com/mizchi/actrun/releases)・[bit](https://github.com/bit-vcs/bit/releases)・[vibe](https://github.com/mizchi/vibe-lang/releases)・[luna.mbt](https://github.com/mizchi/luna.mbt/releases)・[lsmcp](https://github.com/mizchi/lsmcp/releases)・[similarity](https://github.com/mizchi/similarity/releases) の最初のページ。2026年11月10日に閲覧。

[^chaosbringer]: mizchi「[chaosbringer](https://github.com/mizchi/chaosbringer)」README。2026年11月10日に閲覧。

[^vlmkit]: mizchi「[vlmkit](https://github.com/mizchi/vlmkit)」README。2026年11月10日に閲覧。

[^flaker]: mizchi「[flaker](https://github.com/mizchi/flaker)」README。2026年11月10日に閲覧。

[^skills]: mizchi「[skills](https://github.com/mizchi/skills)」README。2026年11月10日に閲覧。

[^pkfire]: mizchi「[pkfire](https://github.com/mizchi/pkfire)」README。2026年11月10日に閲覧。

[^k1c]: mizchi「[k1c](https://github.com/mizchi/k1c)」README。2026年11月10日に閲覧。

[^moonbit-core]: GitHub の検索 API で `author:mizchi type:pr repo:moonbitlang/core` に当たるプルリクエスト。最初は「[perf(bigint): speed up large BigInt x small scalar multiplication](https://github.com/moonbitlang/core/pull/3620)」core #3620、2026年5月23日。

[^vibe]: mizchi「[vibe-lang](https://github.com/mizchi/vibe-lang)」README。2026年11月10日に閲覧。

[^vibe-594]: mizchi「[MoonBit src/ retirement → selfhost-only (staged migration)](https://github.com/mizchi/vibe-lang/pull/594)」vibe-lang #594、2026年6月23日。

[^dspec]: mizchi「[dspec](https://github.com/mizchi/dspec)」README。2026年11月10日に閲覧。

[^uneffect]: mizchi「[uneffect](https://github.com/mizchi/uneffect)」README。2026年11月10日に閲覧。

[^jev-lint]: mizchi「[jev-lint](https://github.com/mizchi/jev-lint)」README。2026年11月10日に閲覧。

[^explainer]: mizchi「[explainer](https://github.com/mizchi/explainer)」README。2026年11月10日に閲覧。

[^oxc]: GitHub の検索 API で `author:mizchi type:pr repo:oxc-project/oxc` に当たるプルリクエスト。たとえば「[fix(minifier): keep side effects when rotating bitwise operands](https://github.com/oxc-project/oxc/pull/25596)」oxc #25596、2026年8月13日。

[^void]: mizchi「[fix(solid): preserve SSR DOM when hydrating islands](https://github.com/voidzero-dev/void/pull/488)」void #488、2026年10月19日。

[^walz]: mizchi「[walz-lang](https://github.com/mizchi/walz-lang)」README。2026年11月10日に閲覧。

[^isle]: mizchi「[isle](https://github.com/mizchi/isle)」README。2026年11月10日に閲覧。
