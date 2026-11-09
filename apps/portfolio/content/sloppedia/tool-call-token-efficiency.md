---
title: "ツール呼び出しのトークン効率化"
description: "LLM のエージェントが道具（ツール）を呼ぶときに消費するトークンを減らす手法の総称。道具の定義・道具の結果・往復の回数・キャッシュの 4 か所で工夫する。"
tags:
  [
    "大規模言語モデル",
    "AI エージェント",
    "Model Context Protocol",
    "コンテキストエンジニアリング",
    "2026年のソフトウェア",
  ]
published: true
infobox:
  - label: "対象"
    value: "LLM のエージェントの道具の呼び出し"
  - label: "主な手法"
    value: "tool search、コードによる呼び出し、context editing"
  - label: "主な提唱元"
    value: "Anthropic、OpenAI、Cloudflare"
  - label: "関連する仕様"
    value: "Model Context Protocol"
  - label: "調査時点"
    value: "2026年11月9日"
---

ツール呼び出しのトークン効率化は、LLM のエージェントが道具（ツール）を呼ぶときに消費するトークンを減らす手法の総称である。道具の定義・道具が返す結果・呼び出しの往復・プロンプトキャッシュの 4 か所が工夫の対象になる。

[Model Context Protocol](/sloppedia/model-context-protocol)（MCP）が広まり、1 つのエージェントにつなぐ道具の数は数十から数千に増えた。Anthropic は2025年11月に、道具の定義をすべて先に読み込むと、依頼を読む前に数十万トークンを処理することになると指摘した[^code-execution]。以後、Anthropic・OpenAI・Cloudflare が、定義を必要な分だけ読み込む仕組みや、道具をコードから呼ばせる仕組みを相次いで出した。

各社が公表した削減の幅は、道具の定義で85%から99.9%、複雑なタスクの総トークンで37%である[^advanced-tool-use][^cf-code-mode]。ただし数値のほとんどは提供元の自己計測で、独立した再現は2026年11月時点で見当たらない。

## トークンを消費する場所

### 道具の定義

API に渡した道具の定義は、モデルへの入力のトークンとして毎回数えられる。OpenAI のドキュメントは、呼べる関数の定義はコンテキストの上限を消費し、入力のトークンとして課金されると明記している[^openai-fc]。

Anthropic の Agent SDK のドキュメントによると、50 個の道具の定義は 1 万から 2 万トークンを使う[^sdk-tool-search]。1 個あたりの量は道具によって大きく異なる。MCP の仕様のリポジトリで2026年5月に始まった議論では、GitHub の MCP サーバーの 26 個の道具で 3,546 トークンと報告された[^mcp-2812]。

定義の量が増えると、トークンが増えるだけでなく道具の選び方も悪くなる。Agent SDK のドキュメントは、道具が 30 から 50 個を超えると選択の精度が落ちるとしている[^sdk-tool-search]。OpenAI も、1 回の発話の時点で呼べる関数を 20 個未満にするよう勧めている[^openai-fc]。

### 道具の使い方の説明

Claude では、道具を 1 つでも渡すと、道具の使い方を説明するシステムプロンプトが自動で足される。2026年11月時点のドキュメントでは、Claude Opus 5.5 で `tool_choice` が `auto` か `none` のとき 286 トークンである[^claude-tool-overview]。Claude Sonnet 4.6 と Claude Opus 4.6 では 497 トークンだった[^claude-tool-overview]。

### 道具の結果

道具が返した結果は、会話の履歴に残り、後のすべての発話で入力として読み直される。Anthropic の cookbook の実例では、8 つの文書を読むエージェントのコンテキストが最大で 335,279 トークンに達し、その96.3%がファイルを読んだ結果だった[^cookbook-context]。

道具の結果を別の道具に渡すときは、同じデータがモデルを 2 回通る。Anthropic は、2 時間の会議の文字起こしを Google Drive から Salesforce へ写すだけで、約 5 万トークンが余分にかかる例を挙げた[^code-execution]。

### 往復の回数

道具を 1 回呼ぶたびに、モデルの推論が 1 回走る。呼び出しが 20 回続けば、そのたびに履歴の全体を読み直す。往復の回数はトークンと待ち時間の両方に効く[^advanced-tool-use]。

## 定義を必要な分だけ読み込む

### tool search

tool search は、道具の定義を最初のプロンプトに入れず、モデルが検索して見つけた道具だけをその場で読み込む仕組みである。

Anthropic の Claude API では、道具に `defer_loading: true` を付けると、その定義は最初のプロンプトから外れる[^claude-tool-search]。検索の道具には、正規表現で探す `tool_search_tool_regex_20251119` と、自然文を BM25 で照合する `tool_search_tool_bm25_20251119` の 2 種類がある[^claude-tool-search]。1 回の検索は既定で最大 5 個の道具を返す。1 回のリクエストで遅延読み込みにできる道具は 1 万個までである[^claude-tool-search]。

Anthropic は2025年11月の発表で、50 個を超える MCP の道具を使う評価を示した。定義のトークンは約85%減り、道具の選択の精度は Claude Opus 4 で49%から74%、Claude Opus 4.5 で79.5%から88.1%に上がった[^advanced-tool-use]。2026年11月時点のドキュメントでは、tool search はベータを終え、すべてのモデルで使える[^claude-tool-search]。

ドキュメントは、道具が 10 個以上あるときや、定義が 1 万トークンを超えるときに使うよう勧めている[^claude-tool-search]。よく使う 3 から 5 個の道具は遅延読み込みにせず、最初から渡しておくのがよいとされる[^claude-tool-search]。

tool search にも代償がある。検索のたびに往復が 1 回増えるので、道具が 10 個未満なら全部を先に読み込むほうが普通は速い[^sdk-tool-search]。[Claude Code](/sloppedia/claude-code) が使う Agent SDK では tool search が既定で有効で、`ENABLE_TOOL_SEARCH=auto:N` を指定すると、定義がコンテキストの N% を超えたときだけ有効になる[^sdk-tool-search]。

OpenAI の Responses API にも同じ名前の仕組みがある。`tools` の配列に `tool_search` を足し、関数か MCP サーバーの定義に `defer_loading: true` を付ける[^openai-tool-search]。対応するモデルは gpt-5.4 以降である。見つかった道具はコンテキストの末尾に足されるので、キャッシュされた先頭の部分は保たれる[^openai-tool-search]。OpenAI は削減の幅を数値で示していない。関連する関数を `crm` や `billing` のような名前空間にまとめると、効果が出やすいとしている[^openai-fc]。

### ゲートウェイでの絞り込み

複数の MCP サーバーを 1 つにまとめるゲートウェイも、定義を減らす機能を持つ。Cloudflare の [MCP server portals](/sloppedia/cloudflare-mcp-server-portals) は、2026年3月に `optimize_context` の指定を加えた。`minimize_tools` を選ぶと道具の名前だけを返し、説明とスキーマは検索の道具で必要なときに取らせる[^cf-portals]。

### 研究での扱い

道具を検索してから選ばせる考え方は、2025年の研究にも現れている。RAG-MCP は、問いに合う道具を検索で先に絞ってから LLM に渡す方式で、プロンプトのトークンを半分以下にし、道具の選択の精度を13.62%から43.13%に上げたと報告した[^rag-mcp]。MCP-Zero は、モデル自身が要る道具を言葉で求め、サーバー、道具の順に段階的に検索する。308 個のサーバーと 2,797 個の道具を集めた評価で、APIBank でのトークンの消費を98%減らしたとしている[^mcp-zero]。

### MCP の仕様

MCP の仕様は、2026年11月時点でも、`tools/list` がすべての道具の完全なスキーマを返す形のままである。道具の名前と要約だけを返す最小の一覧や、スキーマを個別に取る手続きは、提案の段階にとどまる[^mcp-1923][^sep-1576]。

2026年7月28日付けの改訂では、一覧の結果に鮮度の目安 `ttlMs` とキャッシュの範囲 `cacheScope` が必須になった[^mcp-changelog]。サーバーは `tools/list` の道具を決まった順で返すべきだとされた。クライアント側のキャッシュと、LLM のプロンプトキャッシュの当たりを良くするためである[^mcp-changelog]。

## 道具をコードから呼ばせる

### Code execution with MCP

Anthropic は2025年11月、MCP の道具の定義をモデルへ直接渡さず、コードの API としてファイルに置く方式を示した[^code-execution]。MCP サーバーごとに `./servers/` の下へ TypeScript のファイルを置き、エージェントはファイルの一覧を見て必要な定義だけを読む。道具はエージェントが書いたコードから呼ばれ、途中の結果はコードの実行環境にとどまる。

Anthropic の例では、150,000 トークンを使っていた処理が 2,000 トークンになった[^code-execution]。98.7%の削減である。ただしこの数字には、エージェントが書いたコードとその実行結果のトークンは含まれていない。

### Cloudflare の Code Mode

[Cloudflare の Code Mode](/sloppedia/cloudflare-code-mode) は、API 全体を `search()` と `execute()` の 2 つの道具で渡す仕組みである[^cf-code-mode]。エージェントは型の付いた JavaScript を書き、そのコードは隔離された Worker の中で動く。

Cloudflare は2026年2月に、2,500 を超えるエンドポイントを持つ Cloudflare の API 全体を、約 1,000 トークンの定義で渡せると発表した[^cf-code-mode]。tiktoken で数えた比較の相手は、Code Mode を使わない同等の MCP サーバーの約 117 万トークンで、削減は99.9%になる。ページの説明文のメタデータは比較の相手を「200 万トークン超」と書いており、本文の数字と合っていない[^cf-code-mode]。

### Programmatic Tool Calling

Programmatic Tool Calling は、Claude が道具の呼び出しをコードの中で組み合わせ、途中の結果をサンドボックスにとどめる Claude API の機能である[^advanced-tool-use]。Anthropic の社内評価では、複雑な調査のタスクで平均のトークンが 43,588 から 27,297 に減った[^advanced-tool-use]。37%の削減である。

1 つのコードの中で道具を 20 回以上呼べば、推論が 19 回以上要らなくなる[^advanced-tool-use]。依存し合う呼び出しが続くときや、大きなデータを絞り込むときに効く。道具を 1 回呼ぶだけの処理や、結果が小さい処理では効果が小さい。

## 道具の結果を減らす

### 道具の設計

Anthropic は2025年9月の記事「Writing effective tools for agents」で、結果のトークンを減らすための道具の作り方を示した[^writing-tools]。

大きくなりうる結果には、ページング・範囲の指定・絞り込み・切り詰めを組み合わせ、引数に妥当な既定値を持たせる。切り詰めるときは、続きの取り方をエージェントに知らせる文を結果に添える。Claude Code は、道具の結果を既定で 25,000 トークンに制限している[^writing-tools]。

結果の詳しさを選ばせる `response_format` の引数も勧められている。値は `concise` と `detailed` の 2 つである。Slack のスレッドを返す例では、`detailed` が 206 トークン、`concise` が 72 トークンだった[^writing-tools]。`concise` は後の呼び出しに要る ID を省くので、`detailed` も残しておく。

細かい道具を並べず、1 つの道具にまとめる方法もある。記事は次のような置き換えを挙げている[^writing-tools]。

| 置き換え前                                              | 置き換え後             |
| ------------------------------------------------------- | ---------------------- |
| `list_users`・`list_events`・`create_event`             | `schedule_event`       |
| `read_logs`                                             | `search_logs`          |
| `get_customer_by_id`・`list_transactions`・`list_notes` | `get_customer_context` |

まとめた道具は、内部で複数の API を呼び、要る部分だけを返す。往復の回数と途中の結果の両方が減る。OpenAI も、いつも続けて呼ばれる関数は 1 つにまとめ、できる処理はモデルでなくコードに任せるよう勧めている[^openai-fc]。

意味のない UUID を名前や 0 から始まる番号に置き換えると、取り出しの精度が上がるという指針もある[^writing-tools]。こちらはトークン数の比較を示していない。

### context editing

context editing は、古い道具の結果を会話の履歴から消す Claude API の機能である[^context-editing]。入力のトークンが設定したしきい値を超えると、古い `tool_result` を置き換えの文に差し替える。道具を呼んだという記録は残る。履歴を機械的に書き換えるだけなので、要約のための推論は走らない。

道具の種類は `clear_tool_uses_20250919` で、2026年11月時点でもベータである[^context-editing]。既定では、入力が 10 万トークンを超えたときに、直近の 3 回分を残して古い結果を消す。1 回に消す最低の量（`clear_at_least`）や、消さない道具（`exclude_tools`）も指定できる。

Anthropic は2025年9月の発表で、100 回の発話にわたる web 検索の評価を示した。コンテキストが尽きて失敗していた処理が最後まで進み、トークンの消費は84%減った[^context-management]。cookbook の実例では、しきい値を 3 万トークンにすると、最大のコンテキストが 335,279 トークンから 173,137 トークンに下がった[^cookbook-context]。

長い会話を続ける主な手段として、2026年11月時点のドキュメントは、サーバー側で履歴を要約する compaction を挙げている[^context-editing]。

### 圧縮した表記

JSON の代わりに TOON などの短い表記で結果を渡し、トークンを減らす試みもある。Kutschka と Geiger の2026年5月のプレプリント「Notation Matters」は、オープンウェイトの 5 つの構成と 4 つのベンチマークで、この方式を測った[^notation-matters]。

入力だけを短い表記にすると、トークンは2%から18%減り、精度は約 9 ポイント下がった[^notation-matters]。モデルに道具の呼び出しも同じ表記で書かせると、BFCL の総合の精度は JSON の82.7から93.3に対し、TOON では55.9から57.7に落ちた。並列の呼び出しを問う項目では、ほとんどの組み合わせで正答がほぼ 0 になった[^notation-matters]。フロンティアモデルでの測定は無い。

## 往復と出力を減らす

### 出力のトークン

Anthropic の token-efficient tool use は、道具を呼ぶときのモデルの出力を短くする機能である。ベータの時期には、出力のトークンを平均14%、最大70%減らすとされた[^token-efficient]。今は Claude 4 以降のすべてのモデルで既定になり、指定は要らない[^token-efficient]。

### 並列の呼び出し

互いに依存しない道具は、1 回の応答でまとめて呼べる。Claude・OpenAI・Gemini のどれも並列の呼び出しに対応している[^claude-tool-overview][^gemini-fc]。Gemini のドキュメントは、依存しない関数を同時に呼ぶ並列の呼び出しと、順に連ねる呼び出しを分けて説明している[^gemini-fc]。

並列にできるかはモデルの振る舞いにも左右される。Google の開発者フォーラムには、Gemini 3 Flash が独立した呼び出しをまとめずに 1 つずつ返すという報告がある[^gemini-forum]。並列の呼び出しでトークンがどれだけ減るかを測った一次資料は、2026年11月時点で見当たらない。

### ストリーミング

Anthropic の fine-grained tool streaming は、道具の引数を JSON として検証する前に流し始める機能である[^fine-grained]。道具に `eager_input_streaming: true` を付けて使う。大きな引数を書く道具では、最初の応答までの時間が縮む。トークンの量は変わらず、途中で不完全な JSON が届く場合もある[^fine-grained]。

## プロンプトキャッシュとの関係

### 先頭の一致

プロンプトキャッシュは、入力の先頭の部分が前のリクエストと同じであれば、その処理を省く仕組みである。Anthropic は、道具、システムプロンプト、会話の順に先頭をバイト単位で照合する[^claude-caching]。このため道具の配列を変えると、会話全体のキャッシュが外れる[^claude-caching]。OpenAI でも、道具・スキーマ・その並び順がキャッシュの対象の先頭に含まれる[^openai-caching]。

道具の定義と並び順を固定することが、キャッシュを効かせる前提になる。MCP の仕様が道具の一覧を決まった順で返すよう求めたのも、この理由による[^mcp-changelog]。

### 配列を変えずに道具を切り替える

tool search で見つかった道具は、最初のプロンプトではなく後から足されるので、キャッシュは外れない[^claude-tool-search][^openai-tool-search]。Claude API では、遅延読み込みの道具に `cache_control` を付けるとエラーになる[^claude-tool-search]。

使える道具を途中で変えたいときのために、各社は配列を変えずに切り替える仕組みを用意した。Claude API では、道具を最初にすべて宣言しておき、会話の途中に足すシステムメッセージの `tool_addition` と `tool_removal` で切り替える[^claude-mid-conversation]。この切り替えはベータの機能である。OpenAI では、`tool_choice` の `allowed_tools` でリクエストごとに呼べる道具を絞る[^openai-caching]。

### 結果の削除との衝突

context editing で古い結果を消すと、そこから後のキャッシュは外れ、キャッシュを書き直す費用がかかる[^context-editing]。`clear_at_least` は、1 回の削除でその費用に見合う量を空けるための設定である[^cookbook-context]。

## 評価と限界

この分野の数値のほとんどは、Anthropic・OpenAI・Cloudflare の自己計測である。方法・試行の回数・ばらつきは公開されていない。Anthropic の主な数値は2025年の Claude Opus 4 と Claude Opus 4.5 の時期のもので、2026年のモデルでは測り直されていない。

手法どうしにはトレードオフがある。tool search は往復を 1 回増やし、結果の削除はキャッシュを外し、コードによる呼び出しは単発の呼び出しではあまり効かない。どれが得かは、道具の数・結果の大きさ・会話の長さで変わる。これらを組み合わせたときの合計の費用を比べた資料は、2026年11月時点で見当たらない。

## 関連項目

- [Model Context Protocol](/sloppedia/model-context-protocol)
- [MCP server portals](/sloppedia/cloudflare-mcp-server-portals)
- [Cloudflare の Code Mode](/sloppedia/cloudflare-code-mode)
- [プロンプトキャッシュ](/sloppedia/prompt-caching)
- [コンテキストエンジニアリング](/sloppedia/context-engineering)
- [Claude Code](/sloppedia/claude-code)

[^code-execution]: Adam Jones, Conor Kelly「[Code execution with MCP: Building more efficient agents](https://www.anthropic.com/engineering/code-execution-with-mcp)」Anthropic Engineering、2025年11月4日。2026年11月9日閲覧。

[^advanced-tool-use]: Anthropic「[Introducing advanced tool use on the Claude Developer Platform](https://www.anthropic.com/engineering/advanced-tool-use)」Anthropic Engineering、2025年11月24日。2026年11月9日閲覧。

[^writing-tools]: Anthropic「[Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)」Anthropic Engineering、2025年9月11日。2026年11月9日閲覧。

[^context-management]: Anthropic「[Managing context on the Claude Developer Platform](https://claude.com/blog/context-management)」Claude Blog、2025年9月29日。2026年11月9日閲覧。

[^context-editing]: Anthropic「[Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)」Claude Platform Docs。2026年11月9日閲覧。

[^cookbook-context]: Anthropic「[Context engineering: memory, compaction, and tool clearing](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)」Claude Cookbook、2026年3月20日。2026年11月9日閲覧。

[^claude-tool-search]: Anthropic「[Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)」Claude Platform Docs。2026年11月9日閲覧。

[^sdk-tool-search]: Anthropic「[Tool search](https://code.claude.com/docs/en/agent-sdk/tool-search)」Claude Agent SDK docs。2026年11月9日閲覧。

[^claude-tool-overview]: Anthropic「[Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)」Claude Platform Docs。2026年11月9日閲覧。

[^claude-caching]: Anthropic「[Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)」Claude Platform Docs。2026年11月9日閲覧。

[^claude-mid-conversation]: Anthropic「[Mid-conversation system messages and tool changes](https://platform.claude.com/docs/build-with-claude/mid-conversation-system-messages)」Claude Platform Docs。2026年11月9日閲覧。

[^token-efficient]: Anthropic「[Token-efficient tool use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/token-efficient-tool-use)」Claude Docs。2026年11月9日閲覧。

[^fine-grained]: Anthropic「[Fine-grained tool streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming)」Claude Platform Docs。2026年11月9日閲覧。

[^openai-fc]: OpenAI「[Function calling](https://developers.openai.com/api/docs/guides/function-calling)」OpenAI API docs。2026年11月9日閲覧。

[^openai-tool-search]: OpenAI「[Tool search](https://developers.openai.com/api/docs/guides/tools-tool-search)」OpenAI API docs。2026年11月9日閲覧。

[^openai-caching]: OpenAI「[Prompt Caching 201](https://developers.openai.com/cookbook/examples/prompt_caching_201)」OpenAI Cookbook。2026年11月9日閲覧。

[^cf-code-mode]: Cloudflare「[Code Mode: give agents an entire API in 1,000 tokens](https://blog.cloudflare.com/code-mode-mcp/)」The Cloudflare Blog、2026年2月20日（2026年7月15日更新）。2026年11月9日閲覧。

[^cf-portals]: Cloudflare「[MCP server portals](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/)」Cloudflare One docs。2026年11月9日閲覧。

[^gemini-fc]: Google「[Function calling with the Gemini API](https://ai.google.dev/gemini-api/docs/function-calling)」Gemini API docs。2026年11月9日閲覧。

[^gemini-forum]: Google AI Developers Forum の投稿。「[Why does Gemini 3 Flash return sequential single tool calls instead of batching independent ones?](https://discuss.ai.google.dev/t/why-does-gemini-3-flash-return-sequential-single-tool-calls-instead-of-batching-independent-ones/139771)」。2026年11月9日閲覧。

[^mcp-changelog]: Model Context Protocol「[Key Changes（2026-07-28）](https://modelcontextprotocol.io/specification/2026-07-28/changelog)」Model Context Protocol Specification。2026年11月9日閲覧。

[^mcp-2812]: 「[MCP spec should address tool schema token overhead](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2812)」Discussion #2812、2026年5月28日。2026年11月9日閲覧。

[^mcp-1923]: 「[Progressive Tool Discovery for Token Efficiency](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1923)」modelcontextprotocol/modelcontextprotocol Discussion #1923。2026年11月9日閲覧。

[^sep-1576]: 「[SEP-1576: Mitigating Token Bloat in MCP](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1576)」modelcontextprotocol/modelcontextprotocol Issue #1576。2026年11月9日閲覧。

[^rag-mcp]: 「[RAG-MCP: Mitigating Prompt Bloat in LLM Tool Selection via Retrieval-Augmented Generation](https://arxiv.org/abs/2505.03275)」。Tiantian Gan, Qiyao Sun、arXiv:2505.03275、2025年5月6日。2026年11月9日閲覧。

[^mcp-zero]: 「[MCP-Zero: Active Tool Discovery for Autonomous LLM Agents](https://arxiv.org/abs/2506.01056)」。Xiang Fei, Xiawu Zheng, Hao Feng、arXiv:2506.01056、2025年6月1日。2026年11月9日閲覧。

[^notation-matters]: 「[Notation Matters: A Benchmark Study of Token-Optimized Formats in Agentic AI Systems](https://arxiv.org/abs/2605.29676)」。Lorenz Kutschka, Bernhard Geiger、arXiv:2605.29676、2026年5月28日（v2 は2026年6月17日）。査読前のプレプリント。2026年11月9日閲覧。
