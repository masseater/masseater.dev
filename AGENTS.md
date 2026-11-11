作業を始める前に `repo-conventions` と `vite-plus` の skill を読み、従う。どちらも masseater/skills にあり、`vp install` が `.agents/skills/` に入れる。

## コマンド

- `vp run verify` は `vp check` と、`vite.config.ts` の `verify` タスクの `dependsOn` に並ぶ検査をすべて動かす。パッケージごとの検査（`<パッケージ>#<タスク>`）は `checks.config.ts` の `packageChecks` に並べる。pre-push フックも同じものを動かす。
- `verify` タスクと pre-commit フックは、lint を `GOMEMLIMIT=4GiB` で動かす。tsgolint は制限が無いと約 7 GB まで膨らみ、メモリが 14 GB のクラウドのセッションでは OOM で落ちる。4 GiB にすると約 3.9 GB に収まり、かかる時間は変わらない。
- `vp check` の decision ルールは `apps/portfolio/src` だけに掛かり、`OPENROUTER_API_KEY` で判定する。
- 1 つのテストは、そのパッケージのディレクトリで `vp test run <ファイル>` で動かす。

## 構成

- `apps/portfolio` は TanStack Start（RSC）で全ページをプリレンダーし、`Website.StaticSite` で静的サイトとして Cloudflare に置く。blogs と sloppedia の記事は `apps/portfolio/content/` の Markdown を `import.meta.glob` で読み、外部の CMS に寄せない。`/projects` は記事を持たず、`src/pages/projects/model/projects.ts` に並べた名前・1 行の説明・種類のタグ（site・package など）・実物へのリンクだけを出す。タグの絞り込みは blogs と同じ `features/tag-filter` を使う。詳しい説明は blogs に書き、そこへリンクする。`apps/portfolio/app-name.ts` の `APP_NAME` を変えるとリソースは作り直される。
- `apps/portfolio` の直下にはスタックと設定だけを置き、Worker は `worker/`、Vite と Markdown のプラグインは `vite-plugins/`、手で動かすスクリプトは `scripts/` に置く。
- 静的サイトの Worker（`worker/site.worker.ts`）は `/api/stars/*` だけを先に受け、blogs の star を D1 に数える。同じ IP からの star は 1 記事 1 つで、IP は `VISITOR_SALT` を混ぜたハッシュで持つ。ほかのリクエストは静的アセットに渡す。
- サイトを出すためのリソースは `apps/portfolio` のスタックに近接して置く。ゾーンやアカウント全体に効く部品は `infra/cloudflare-account` に置き、`apps/portfolio` のスタックが名前を渡して作る。`alchemy.run.ts` は prod ステージでだけ `edge-guard.ts`・`log-archive.ts`・`account-readers.ts` の読み取り用トークンを作る。`edge-guard.ts` はスキャナーを弾く WAF ルールとハニーポットの Worker を、`log-archive.ts` は全 Worker のログを R2 に送る Logpush を持つ。トレースの送信先は、`alchemy.traces.ts` のスタックが `@r_masseater/workers-tracing` の `traceSink` で作る。
- `infra/mcp-portal` は個人用 MCP をまとめた入口 mcp.masseater.dev（Cloudflare の MCP ポータル）のスタックで、main の verify の `mcp-portal` ジョブが当てる。本人だけを通す条件は personal-space の mydecklist スタックにある再利用ポリシー `OwnerPolicy` を `Policy.ref` で引き、メールアドレスをこのリポに置かない。Cloudflare 公式の MCP（`mcp.cloudflare.com/mcp`）だけは OAuth でつながず、portfolio のスタックが作る全リソース読み取り専用のアカウントトークン `CloudflareReader`（`infra/cloudflare-account/account-readers.ts`）を `AccountApiToken.ref` で引いて bearer で渡す。書き込みの権限は足さない。
- `infra/repositories` は個人アカウントの GitHub を管理する `masseater-dev-github` スタックで、main の verify の `github` ジョブが当てる。リポは GitHub App のインストールから実行時に一覧し、コードには private リポの名前を書かない。方針はコードの 1 か所に書き、`visibility` は渡さず公開範囲に触らない。private の名前は `github-token.sh` がログで伏せる。CI にトークンを出す broker（credentials.masseater.dev）も、別のスタック `alchemy.broker.ts` としてここに置き、main の verify の `deploy` ジョブが当てる。リポごとに broker が出す Cloudflare・GitHub・npm の権限は `credential-grants.ts` に書く。
- リポの削除は `delete-repositories` ワークフローを main で手動実行する。名前はイベントのファイルから読んでログで伏せるので、private のリポもコードとログに名前が出ない。
- GitHub のトークンも broker が出す。App は `masseater-manager` だけで、鍵は broker の Worker だけが持つ鍵（スタックの `SealKey`）で暗号化して D1 に置く。`SealKey` の名前を変えたり state から消したりすると鍵が作り直され、保管した値は読めなくなるので、そのときは App の鍵と Bluesky の app password を入れ直す。鍵の原本は personal-space の secret にあり、personal-space の `github-app-key` ワークフローが `POST https://credentials.masseater.dev/github-app/import` で渡す。broker は鍵で App 自身として名乗れることと持ち主を確かめてから保存する。
- broker は Cloudflare Access の Managed OAuth のクライアントも兼ねる。対象のサイトは `infra/repositories/access-sites.ts` に並べる。持ち主が `https://credentials.masseater.dev/access-oauth/login?site=<ホスト>` で一度 Google にログインすると、broker は DCR・PKCE・RFC 8707 の `resource` でトークンを取り、リフレッシュトークンを `SealKey` で暗号化して D1 に置く。エージェントは personal-mcp の `get_access_token` で、本人と同じ認証を通ったアクセストークンを受け取り、`Authorization: Bearer` で Access の背後のサイトを開く。service token や bypass のポリシーで素通しさせない。
- `apps/portfolio/worker/ci-telemetry.worker.ts` は、masseater/typescript-template の composite action `ci-telemetry` が送るジョブとステップの時間を GitHub の OIDC トークンで確かめ、ログに出す。
- `apps/portfolio/content/sloppedia/` は、Wikipedia 風の個人の百科事典もどき Sloppedia の記事である。`/sloppedia/` の下は、サイトの背景を持つ `_stage` レイアウトの外にある独自の見た目のページで、`noindex` を付けて sitemap とフィードから外す。
- Sloppedia の見た目は `libs/sloppedia`（npm の `sloppedia`）にあり、portfolio はそれに TanStack Router の Link を渡して使う。npm へは version を上げてから `publish.yml` を main で手動実行して出す。バンドルサイズが上限に当たったら上限を上げずに軽くする。
- `apps/labs` は React を使わない単体のページ（`/satsuei-lab/`・`/split-pad/`・`/pod-rattle/`）で、`pages/<名前>/index.html` を Vite の multi-page でバンドルし、静的アセットだけの Worker を masseater.dev のルートに載せる。three や d3 は、ページの inline の `<script type="module">` で npm から import する。ページを足したら `pages.ts` の `PAGES` に足す。
- `libs/rpp-kit` は REAPER の `.rpp` を読むパーサーと Vite プラグインと TypeScript の content mapper で、`apps/rpp-kit-demo` がそれを使うデモを `/rpp-kit/` に載せる。スタック名と `APP_NAME` は元のリポの `rpp-kit` のままにしている。
- `apps/medley-manager` は、ニコメドや合作で使われた曲と動画を逆引きするメドDB（`medley-manager.masseater.dev`）で、TanStack Start と Elysia と D1 で動く。Web は閲覧だけで、書き込みは `/mcp` のリモート MCP から持ち主のパスキーで行う。スタック名と `APP_NAME` は `medley-manager` のままにしていて、変えると D1 が作り直されてデータが消える。本番のログは `worker-logs` ワークフローで読む。
- `apps/sts2-mods` は Slay the Spire 2（AppID 2868840、MegaDot 4.5.1 と C# net9.0）の Mod で、初代 Slay the Spire（Java・ModTheSpire）の知識は使わない。警告はエラーにしていて、ルールを緩めて通さない。ゲーム本体で確かめていないことを「動く」と書かない。verify の `sts2-mods#dotnet` がゲーム本体の代わりに `build/Sts2Stubs` で型検査し。.NET SDK は `apps/sts2-mods/global.json` と同じ版をルートの `mise.toml` に書く。main の verify の `sts2-pck` ジョブが MegaDot で .pck を書き出す。
- `apps/three-twelve` は毎日 3 時 12 分（JST）に、bot の入ったサーバーで人のいるボイスチャンネルへ入って曲を 1 回流し、抜ける Discord bot である。Worker の cron が Durable Object の alarm を仕掛け、alarm が Cloudflare Containers で `player/main.ts`（discord.js）を exec する。bot のトークンは `PUT /three-twelve/token` で DO に、曲（Ogg Opus）は `PUT /three-twelve/audio` で R2 に置く。トークンは持ち主の Discord アプリのものだけを受け付ける。曲は著作物なのでリポに入れない。
- `apps/pod-rattle-plugin` は labs の Pod Rattle を Rust（nice-plug）で VST3・CLAP にしたもので、音の本体は `libs/pod-rattle-engine` にある。Rust はルートの Cargo ワークスペースに置き、crate ごとに最小の package.json と `vite.config.ts` の `cargo` タスク（fmt・clippy・テスト）を持たせて、ルートの verify から vp のタスクとキャッシュで動かす。crate を足したら同じ形で package.json と `cargo` タスクを作り、`packageChecks` に足す。Rust の版は `rust-toolchain.toml` で固定し、CI は `rustup toolchain install` でそれを入れ、Renovate が上げる。`cargo run --package xtask --release -- bundle-all --release` が `target/bundled/` に出す。`pod-rattle` ワークフローは main への push ごとに 3 OS でビルドし、pluginval（エディタの開閉を含む）と clap-validator に通したうえで、`tools/pod-rattle-host` が VST3 に MIDI を送って鳴らし、エンジンを直接鳴らした音と比べる。エディタは同じツールの egui_kittest のテストが画面なしで操作し、描いた画像を `tests/snapshots/` と比べる。画像は `UPDATE_SNAPSHOTS=1` で描き直し、見てからコミットする。release-please が `pod-rattle-v<版>` で出し、zip を付ける。
- 性能の判定は時間ではなく、`benches/instructions.rs` が Valgrind（gungraun）で数える命令数で行う。CI のランナーは速さがまちまちで、時間で判定すると機械によって落ちる。
- オーディオスレッドで確保をしない。配列は初期化で確保し、`no_alloc` テストで確かめる。
- parity テストの参照音は、`tools/pod-rattle-parity` が labs のページから `createEngine` を切り出して鳴らした音である。labs の音を変えたら `libs/pod-rattle-engine` も合わせる。計算の順序を変えると標本単位で一致しなくなるので、速くするときも浮動小数点の演算順は保つ。いずれ labs が `libs/pod-rattle-engine` を wasm で鳴らし、エンジンを 1 本にする。
- `apps/watashi-mcp`（`watashi.masseater.dev/mcp`）は持ち主の個人データの MCP で、人生の記録（`life_*`）と AI の作業メモ（`memory_*`）を D1 に置く。作業メモから人生の記録を書かない。逆はよく、根拠を `evidence` に残す。表への書き込みは `*-writer.server.ts` だけが行い、`revision` 表への追加と同じ D1 の batch に入れる（lint が強制する）。パスキーを登録できるのは招待の文字列を持つ最初の 1 人だけである。会話履歴の仕組みは `apps/watashi-mcp/docs/conversations.md` にある。持ち主が作って公開するものの道具は watashi-mcp に置かず、personal-mcp に置く。
- `apps/kikite`（`kikite.masseater.dev`）は声で答えるヒアリングの聞き手のモックで、質問の方針を切り替えたり並べて比べたりして、よい聞き手の条件を体験から決める。Access（mydecklist スタックの `OwnerPolicy`）の背後に置き、Worker が Containers の中の Claude Agent SDK に要約と質問を作らせる。トークンは broker の Secrets Store にある `CiClaudeCodeOauthToken` を `SecretsStore.Secret.ref` で引く。ローカルの `vp dev` は手元の Claude Code のログインを使う。比べ方の集計は `model/report.ts` の `reportOf` にある。
- `apps/personal-mcp`（`personal-mcp.masseater.dev/mcp`）は Sloppedia・アクセス解析・スライド検索の MCP で、個人データは置かない。スライドのサイトと同じ Access（mydecklist スタックの `OwnerPolicy`）の managed OAuth で守る。ポータルの上流 id `personal` は、Access の DCR が許すダッシュボードのコールバックの末尾と同じにする。MCP のツール呼び出しを Analytics Engine に書く `libs/mcp-tool-call` の列の並びは、どのサーバーでも変えない。
- セイキンダンスの技法ページの素材（`apps/portfolio/public/seikin-techniques/` の dance.mp4・history.jpg と `dance-stage/model/generated/track.json`）は `tools/seikin-dance`（Rust）が元の動画から作る。元の動画はクラウドから取れないので、`vp run --filter @masseater.dev/seikin-dance generate -- <動画>` に渡すか `.cache/source.mp4` に置く。姿勢と人物のマスクは、ヘッドレスの Chrome（`CHROME_PATH`）で `@mediapipe/tasks-vision` の PoseLandmarker（heavy、sha256 を固定）を動かして求める。テストは公開中の dance.mp4 の左の映像から姿勢とマスクを求め直し、公開中の値と比べる。
- `apps/mosaic`（`masseater.dev/mosaic`）はサムネイルのモザイクアートのサイトで、main の verify の `mosaic-character` ジョブがキャラごとに `tools/mosaic`（Rust）で配るファイルを作って `alchemy.files.ts` をキャラの slug のステージで当て、`mosaic-deploy` ジョブが画面を当てる。キャラのファイルを作り直すのは `libs/mosaic`・`tools/mosaic` を変えたときと日次の schedule だけで、`apps/mosaic` だけを変えたときは作り直さない。画面は作り直しを待たずにすぐ当て、作り直しが終わると `mosaic-refresh` ジョブが当て直す。Markdown だけの変更ではどちらも動かない。画面は本番に出ている各キャラの manifest と candidates を取ってプリレンダーする。`tools/mosaic` の `site.rs` と `image.rs` を変えると公開ファイルのリビジョンが変わり、全キャラのファイルを作り直す。画面の Effect のスパンは `/mosaic/otlp/v1/traces` に送り、Web の Worker が workers-tracing の `browserSpans` でトレースの送信先と同じ `otlp.span` のログに出す。
- `apps/nimado`（`masseater.dev/nimado`）はニコニコ動画と YouTube の再生数を曲ごとに並べるサイトで、データは `tools/nimado-collect` が毎日作る。YouTube の値はリポに入れず、30 日を超えて持たない。
- `apps/zenn-articles` はパッケージではない。main の verify が通ると、中身が `zenn` ブランチの直下へ写される。
- `libs/textlint-rule-no-taigendome` はこのリポの検査では使わず、masseater/personal-space が git の subpath 依存で読むので、パスとパッケージ名を動かさない。

## decision モデルの実験

- `libs/injection-bisect` は文書を `Parser` で区間に分け、区間の並びを √n 個の枝に割り、確率が `cutoff` 以上の枝だけを再帰的に細かく問い直す。`apps/injection-bisect-demo` のデモと `tools/injection-bisect-cli` が使う。npm には `dist` を出し、version を上げてから `publish.yml` を package に `injection-bisect` を選んで main で手動実行する。
- `libs/ocr-decide` は請求書の画像を OCR で断片にし、decision モデルで項目に割り当てる。`apps/ocr-decide` はこれをブラウザーで動かし、計測結果も表示する。計測は `tools/ocr-measure` で行う。`render` が `data/` の請求書を画像にし、`measure` が `results/details.json` と `libs/ocr-measurements/summary.json` を書き、`rescore` はモデルに問い合わせず details.json から summary.json を書き直す。
- OCR エンジンの日本語の読み取りは `tools/ocr-ja-bench` で測る。`render` が合成ページを、`prepare-data` が JaWildText の写真を `.cache/` に用意し、`measure [エンジン ID...]` が `results/` と `libs/ocr-measurements/ja-bench.json` を書く。Indra OCR・NDLOCR-Lite・PaddleOCR・Surya は Python でしか動かないので測る手段を外し、`results/` の記録だけを残している。
- `tools/decision-bench-runner` は日本語 decision model のベンチで、`vp run bench` で動かす。モデルごとの結果を `results/<モデル>.json` にコミットし、再実行ではそこで答えの出た問題を呼び直さない。問いの文面や読み取り方を変えたら、そのモデルのファイルを消して測り直す。`cache/` はコミットしない。終わると `docs/decision-bench.md` の `results:start`〜`results:end` の表と `libs/bench-summary/summary.json` を書き換え、`apps/decision-bench` がその JSON からリーダーボードを `/decision-bench` に出す。
- 3 つのデモは `infra/start-site` の Vite と Alchemy の設定と `libs/web-ui` の部品を共有し、main の verify の `decision-experiments` ジョブが stage production で当てる。スタック名と `APP_NAME` は元のリポのまま（`injection-bisect`・`ocr-decide`・`mst-ja-decision-bench`）にしている。
- injection-bisect の入力の形式ごとの処理は `segment.ts` に足さず、`Parser` として並びに加える。形式の読み取りは自前で書かず、officeparser・SheetJS・papaparse・ical.js・srt-vtt-parser・ass-compiler・nbformat・linguist-languages と refractor・file-type などのライブラリを使う。
- `respan/` のモデルには、1 リクエストに区間ごとの質問を並べない。choice の質問も使わない。既定のモデル `respan/span-01-lite` を変えるときは、計測し直してユーザーに確認する。
- 精度・費用・時間の比較は、無害な入力と注入を含む入力の両方で、フロンティアモデルに直接判定させた場合と並べる。計測の前後に `GET https://openrouter.ai/api/v1/key` でキーの残りを確かめる。
- デモはサーバーの処理を持たない。OpenRouter のキーは見る人が入力し、サーバーは持たず受け取りもしない。

## yakusu

- `apps/yakusu` は PLaMo 3 Translate 0.8B を手元で動かす翻訳のデスクトップアプリである。Tauri 2 の Rust 側（`src-tauri`、ルートの Cargo ワークスペースの一員）が llama.cpp の llama-server を子プロセスとして起動し、`/completion` の流れを訳文として画面へ送る。
- llama-server とライセンスの写しは、`scripts/fetch-runtime.sh` がリビジョンと sha256 を固定して `src-tauri/resources/` に落とす。リポには入れない。
- モデルはインストーラーに入れない。アプリが初回の起動で Hugging Face から取得し、`src-tauri/src/model.rs` に固定した sha256 と合ったものだけをデータフォルダの `models/` に置く。途中で切れた取得は続きから再開する。実モデルでの翻訳は `cargo test -p yakusu --test engine -- --ignored` で確かめ、このテストもアプリと同じ処理でモデルを取得する。
- `yakusu` ワークフローが 3 OS でモデルの取得と実モデルの翻訳を確かめてからインストーラーを作り、`yakusu-v*` のタグのときはリリースに付ける。
- 画面はブラウザーモードの Vitest が偽のエンジンで操作し、`src/app/__screenshots__/` の画像と比べる。
- PLaMo Community License に従い、画面に「Built with PLaMo」を出し、インストーラーにライセンスの写しを入れる。モデルを変えて派生モデルを配るときは、名前の先頭に「PLaMo」を付ける。

## aredoko

- aredoko は Unity エディタの中でアセットを見た目の言葉で探す検索で、製品は UPM パッケージ `dev.masseater.aredoko` である。開発用の Unity プロジェクト `apps/aredoko-unity` に埋め込んで置き、そのプロジェクトで動かして確かめる。利用者向けの導入手順はルートの README.md にある。
- 埋め込みの推論・インデックスの作成・ランキング・BOOTH の商品情報の取得は、同じ PC で常駐するサーバー `apps/aredoko-server` に置き、エディタ拡張は localhost で呼ぶ。常駐サーバーは起動のたびにトークンを作ってデータフォルダの `endpoint.json` に書き、接続の URL にそのトークンを付けた相手だけを受け付ける。Unity の中では推論しない。サーバーは Unity を起動せずにテストできる。推論は Transformers.js で `onnx-community/embeddinggemma-2-ONNX` を動かし、インデックスは SQLite と sqlite-vec に置く。
- 管理アプリは Tauri 2 で `apps/aredoko-desktop` に置く。Rust 側（`src-tauri`、ルートの Cargo ワークスペースの一員）は常駐サーバーの起動と終了だけを受け持つ。インストーラーは `aredoko-desktop` ワークフローが `aredoko-v*` のタグか手動実行で Windows 向けに作る。
- 埋め込みのモデルは EmbeddingGemma 2 である。3D モデルは複数の向きからレンダリングした画像を埋め込み、キャプションを生成してから埋め込む方式は取らない。
- 検索の精度は `tools/aredoko-search-eval` の、検索語と正解のアセットを組にした評価セットで測る。ランキングやモデルを変えるときは、変える前と後の結果を比べる。評価は日本語の検索語を主にする。
- 型の正本は `libs/aredoko-protocol` の Effect Schema である。管理アプリと常駐サーバーは RpcGroup をそのまま共有し、エディタ拡張の C# と Tauri の Rust の型は `tools/aredoko-protocol-codegen` で `vp run codegen` を実行して作り直す。生成物は手で書き換えない。verify は `codegen:check` で食い違いを、`tools/aredoko-csharp-check` でエディタ拡張の `Editor` の下の C# をすべて型検査する。UnityEditor と UnityEngine は、使うメンバーの形だけを Unity 2022.3 のリファレンスから写したスタブで置き換える。
- effect の不安定な API を出す宣言には `/** @internal */` を付ける。effect-tsgo の `api-stability-leak` はこれで公開の面から外れ、コメントの禁止は、この形と、msch に値の持ち主を示す `/** @msch <概念> */` だけを通す。
- エディタ拡張は、VRChat SDK の Unity 2022.3.22f1 で使える API と C# 9 だけで書く。常駐サーバーは Windows 10・11 の x64 で動かすが、開発とテストはクラウドの Linux でも完結させ、Windows でしか確かめられない処理を作らない。
- アセットと検索語は PC の外へ送らない。外部への通信は BOOTH の商品ページの公開 JSON の取得だけにし、BOOTH のログイン状態・Cookie・購入履歴は読まない。ほかのツールのデータは Unity Asset Store の保存先と BOOTH Library Manager のものだけを読み取り、書き換えない。ドロップやファイル選択で渡されたパッケージは、データフォルダの `library` に写してから索引し、元のファイルは動かさない。
- 管理アプリの画面は、`apps/aredoko-desktop` で `vp run dev:app` を実行して開発版を起動し、`agent-browser connect 9222` でつないで調べる。WebView2 のデバッグポートを開くのは開発版だけである。トレースは `tools/aredoko-telemetry` で `vp run jaeger` を実行してから開発版を起動すると、管理アプリ・常駐サーバー・埋め込みのワーカーから `http://127.0.0.1:16686` に届く。`jaeger` 本体はリポが入れないので、PATH に置いておく。

## 計測の部品

- `libs/vitest-otlp`・`libs/web-vitals-flow`・`libs/workers-tracing` は、OpenTelemetry と各ツールの公式の拡張点に差し込んで計測する部品で、npm の `@r_masseater/<名前>` として出す。各サービスやツールの公式機能と自動計装を先に使い、足りないところだけをここで作る。元は masseater/measure-everything にあった。
- 部品は Vite+ と Node.js 26 以降だけを前提にする。`vite-plus` は peer にし、素の `vitest` などほかの環境のための書き換えや分岐は入れない。型定義の無いライブラリは使わず、その部分を自前で実装する。
- `libs/vitest-otlp` はテストファイルごとに OTLP の受け口（HTTP と gRPC）を立て、届いたものを opentelemetry-proto から生成した protobuf-es のコードで読む。生成物は `vp run generate` で作り直し、手で書き換えない。`otlp({ semconv: true })` のテストは Weaver を使う。Weaver はルートの `mise.toml` に書き、CI は setup action の mise-action が、クラウドのセッションは session-start フックが入れる。
- `libs/web-vitals-flow` のテストは Chrome でローカルのページを測る。クラウドのセッションでは session-start フックが `CHROME_PATH` を渡す。
- npm へは version を上げてから `publish.yml` を package に選んで main で手動実行する。Trusted Publisher が無い間は broker が environment `npm` のジョブに npm のトークンを出す。
- 場面ごとの使い分けは masseater/skills の `measure-everything` スキルにある。部品や勧める手段を変えたら、スキルも直す。

## lint の部品

- `libs/oxlint-plugin-decision` は自然文のルールをモデルに判定させる oxlint のプラグインで、`libs/oxlint-plugin-decision-presets` がそのルール集である。`libs/oxlint-typed-rules` は型情報の要る ESLint のルールを TypeScript 7 の `typescript/sync` の上で oxlint に載せる。元のリポのテストは `upstream/` に手を入れずに置き、すべて通す。`libs/vite-plus-adopt` はルートの設定ファイルを `vite.config.ts` に寄せるための `vpa` で、引数なしの 1 回で設定済みの検査を全部動かす。サブコマンドは作らない。元は masseater/lint-kit にあった。
- `libs/textlint-rule-yomiyasu` は、nanaism/yomiyasu の lint（Python）のうち `--strict` が落とす warn と error の規則を TypeScript に写した textlint のルールで、`checks.config.ts` の textlint が `@masseater.dev/yomiyasu` として使う。写した本体は `upstream/` に置いて lint から外し、元のテストから写した例を `upstream/lint.test.ts` で確かめる。ほかのリポは git の subpath 依存で読むので、パスとパッケージ名を動かさない。
- `libs/msch`（npm の `@r_masseater/msch`）は検査の方針をまとめたパッケージで、値の集合と形の持ち主を調べる `msch` と、Vite+ の `lint` に渡す oxlint のプリセットを持つ。プリセットの JS プラグインは msch の依存から解決するので、使う側は msch だけを入れればよい。ルートの `lint.config.ts` は、プリセットに masseater.dev だけのルールと overrides を足す。
- msch と 4 つの部品は npm の `@r_masseater/<名前>` として出す。version を上げてから `publish.yml` を package に選んで main で手動実行する。ビルドは各パッケージの `build` タスクである。4 つの部品のテストは各パッケージの `test` タスクで、ルートの `vp test` からは外している。
- `vite-plus-adopt` が使う betterleaks・actionlint・zizmor は postinstall で入れ、pnpm の `allowBuilds` で許可する。実行時にダウンロードしない。

## 記事

- 記事の日付は frontmatter に書かない。`apps/portfolio/vite-plugins/markdown/remark-git-date.ts` がビルド時に、そのファイルを最初に追加したコミットの日付を `date` として入れる。未コミットのファイルは当日の日付になる。
- 出典は `[^codmon-retrospective]` のような名前のラベルの脚注で書く。remark-gfm が出現順に番号を振って本文の末尾に出典の一覧としてまとめるので、番号も一覧も手で書かない。
- 出典でないリンクは `[文言](URL)` の埋め込みリンクにし、むき出しの URL を置かない。blogs と sloppedia のどちらも同じである。
- Claude との対話を載せるときは、発言を `:::masseater` と `:::claude` のブロックで囲む。`remark-dialogue.ts` がアイコンと名前つきの吹き出しに変える。
- 中身の薄いアイデア段階の blog は、frontmatter に `stage: idea` を付ける。一覧では折りたたみの中に入り、フィードには出ない。
- Sloppedia の記事は personal-mcp の `write_sloppedia_article` からも PR で足される。blog を投稿するツールは MCP に意図して足さない。blog は持ち主が推敲してから出すまとまった文章で、AI が書ける経路は Sloppedia だけにしておくためである。
- Sloppedia の記事どうしは `[語](/sloppedia/<slug>)` でつなぐ。独立した記事にすべき語は、記事がまだ無くてもつなぐ。`remark-wiki-link.ts` がビルド時に、記事があればリンク、無ければ赤字にする。新しい記事の slug は、既存の記事がその題材に張ったリンクの slug に合わせる。
- Sloppedia の記事は百科事典の体裁で書く。冒頭の文を「題名は、〜である。」で始め、出典は名前のラベルの脚注にする。持ち主の意見は「Sloppedia の持ち主の masseater は〜と考えている」のように誰の意見かを書く。

## Cloudflare

- このリポが masseater.dev ゾーンの持ち主で、WAF カスタムルール（prod ステージだけ）と、Cloudflare が返す応答のヘッダの Transform Rule（`alchemy.zone.ts`。broker のトークンで当てる）と、アカウントに 1 つの Logpush のジョブを持つ。Logpush の設定を変えると全 Worker に効く。
