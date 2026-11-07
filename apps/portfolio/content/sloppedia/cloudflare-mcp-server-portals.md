---
title: "MCP server portals"
description: "Cloudflare が Cloudflare One の Access の機能として提供する、複数の MCP サーバーを 1 つの HTTP のエンドポイントにまとめる仕組み。2025年8月にオープンベータ、2026年9月に一般提供となった。"
tags: ["Cloudflare", "Model Context Protocol", "ゼロトラスト", "2025年のソフトウェア"]
published: true
infobox:
  - label: "開発元"
    value: "Cloudflare"
  - label: "初版"
    value: "2025年8月26日（オープンベータ）"
  - label: "一般提供"
    value: "2026年9月24日"
  - label: "製品群"
    value: "Cloudflare One（Access）"
  - label: "旧称"
    value: "Agents Gateway"
  - label: "種別"
    value: "MCP サーバーの集約と認可のゲートウェイ"
  - label: "ドキュメント"
    value: "developers.cloudflare.com"
    href: "https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/"
---

MCP server portals は、複数の [Model Context Protocol](/sloppedia/model-context-protocol)（MCP）サーバーを 1 つの HTTP のエンドポイントにまとめる仕組みである。Cloudflare が、ゼロトラストの製品群 Cloudflare One の Access の機能として提供している[^docs]。利用者は Access でポータルにログインする。MCP クライアントにはポータルの URL を 1 つ登録すればよく、管理者が許可した複数の MCP サーバーの道具を使える[^docs]。

2025年8月26日にすべてのプランでオープンベータとして公開され[^cl-beta]、2026年9月24日に一般提供となった[^cl-ga]。社内の一部の文脈では Agents Gateway と呼ばれていた。API のパスや Terraform のリソース名には、その名残の `agents_gateway` や `agw` が残っている[^docs]。

## 背景

Cloudflare は公開時のブログで、社員が管理されていない MCP サーバーを各自でつなぐ状態を問題に挙げ、組織が MCP の利用を一か所で認可し、記録する必要があると主張した[^blog]。Cloudflare のドキュメントは、管理されずに使われる MCP サーバーを「Shadow MCP」と呼び、ポータルをその統制の中心に位置づけている[^governance]。

## 仕組み

### 接続の流れ

ドキュメントは、リクエストの流れを次のように説明している[^docs]。

1. MCP クライアントがポータルの URL に接続し、OAuth の検出用のメタデータを含む `401` の応答を受け取る
2. 利用者は自分の ID プロバイダーで Access にログインするか、サービストークンのヘッダーを送る
3. Access が利用者を確かめ、ポータルは有効な上流のサーバーの道具の一覧を返す
4. 道具が呼ばれると、ポータルは道具の名前空間から宛先のサーバーを決め、認証情報を付けてリクエストを中継する
5. 上流のサーバーの応答が同じ経路で返る

ポータルのログインには、2026年3月に加わった managed OAuth を使う。Access が OAuth 2.0 の認可コードフローを肩代わりする仕組みで、新しいポータルでは既定で有効になっている[^cl-managed-oauth]。

### 上流の MCP サーバー

ポータルで使う MCP サーバーは、先に Access へ登録しておく。認証の無いサーバーと、OAuth で守られたサーバーのどちらも登録できる[^docs]。OAuth のクライアントは既定では動的クライアント登録（DCR）で作られる。登録の際に管理者が上流でログインしたアカウントは、そのサーバーの管理者の認証情報として使われる[^docs]。

ポータルへ足したサーバーごとに、「Require user auth」を設定する。有効（既定）にすると、利用者は自分のアカウントで上流のサーバーへ個別にログインする。無効にすると、ポータルの利用者は管理者の認証情報でそのサーバーを使う[^docs]。DCR に対応しない Slack や GitHub のような提供元向けには、2026年7月に、事前に登録した OAuth のクライアント ID とシークレットを使う方式が加わった。この方式では利用者ごとのログインが必須である[^cl-static-oauth][^docs]。

上流との通信には Streamable HTTP と SSE を使う。stdio でしか動かない MCP サーバーは、HTTP で受ける仕組みを別に立てない限り登録できない[^docs]。2026年8月には、状態を持たない MCP の仕様 `2026-07-28` に対応した。クライアントと上流のサーバーのそれぞれについて、2025年の仕様との互換を保ったまま、使う仕様を自動で選ぶ[^cl-spec]。2026年9月22日からは、Cloudflare Tunnel などで Cloudflare につないだ私設のネットワーク上の MCP サーバーも、Cloudflare Gateway を経由して登録できる。ただし OAuth の認可とトークンのエンドポイントは、公開のインターネットから届く必要がある[^cl-private]。

### 道具の名前

ポータルを通る道具とプロンプトには、サーバー ID が `{server_id}_{元の名前}` の形で前に付く。たとえば ID が `github` のサーバーの `list_issues` は、`github_list_issues` として見える[^docs]。2026年5月からは、上流のサーバーを変えずに道具とプロンプトの名前と説明を書き換えられる。書き換えはポータルごとにも、サーバーごとにも設定でき、ポータルごとの設定が優先される[^cl-alias]。

すべてのポータルは、上流の道具とは別に次の 3 つの道具を持つ[^docs]。

| 道具                          | 働き                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `portal_list_servers`         | 上流のサーバーの一覧と、それぞれが有効かを返す         |
| `portal_toggle_servers`       | サーバーを選び直すページの URL を返す                  |
| `portal_toggle_single_server` | 1 つのサーバーを、ブラウザーを開かずに有効や無効にする |

利用者は MCP クライアントから、上流のサーバーを有効にしたり無効にしたり、ログインし直したりできる。この機能は2026年4月に加わった[^cl-session]。

## コンテキストの節約

多くのサーバーを 1 つにまとめると、道具の定義がモデルのコンテキストを圧迫する。ポータルには、これを減らすための 2 つの方式がある。

1 つ目は、2026年3月に加わった `optimize_context` のクエリパラメーターである[^cl-context]。`minimize_tools` は道具の説明と入力のスキーマを除いて名前だけを返し、定義は検索用の道具で必要なときに取らせる。ドキュメントは、トークンの使用量を最大で5分の1にできるとしている[^docs]。`search_and_execute` は上流の道具を一覧から隠し、検索と実行の 2 つの道具だけを見せる[^docs]。

2 つ目は [Code Mode](/sloppedia/cloudflare-code-mode) である。Code Mode では、上流の道具が検索と実行の 2 つの道具にまとまる。エージェントは型の付いたメソッドで道具を呼ぶ JavaScript を書き、そのコードは隔離された Dynamic Worker の中で動く。認証情報や環境変数はモデルのコンテキストに入らない[^docs]。Code Mode も2026年3月に加わった[^cl-codemode]。2026年7月からは、ポータルごとに次の 4 つの方針から選ぶ[^cl-codemode-policy]。

| 方針          | API の値     | 既定の状態 | クライアントからの切り替え            |
| ------------- | ------------ | ---------- | ------------------------------------- |
| Off           | `off`        | 使えない   | 受け付けない                          |
| Opt-in        | `opt_in`     | 無効       | `?codemode=search_and_execute` で有効 |
| On by default | `default_on` | 有効       | `?codemode=off` で無効                |
| Enforced      | `enforced`   | 有効       | 受け付けない                          |

新しいポータルの既定は Opt-in である[^cl-codemode-policy]。上流のサーバーが自前の Code Mode を有効にしている場合、ポータルはそのサーバーに対応しない[^docs]。

## 記録と監査

Access は、ポータルを通した道具・プロンプト・リソースの利用を記録する[^cl-ga]。ダッシュボードのログには、時刻・成否・サーバー・使われた道具・処理時間が残る[^docs]。2026年2月からは、Logpush でログを外部の保存先や SIEM へ送れる。ただし Logpush は Enterprise プランだけで使える[^cl-logpush][^docs]。2026年3月からは、ポータルの通信を Cloudflare Gateway に通し、HTTP の記録とデータ損失防止（DLP）の検査をかけられる[^cl-gateway]。

道具の呼び出し回数は API で日ごと・月ごとに集計できる。2026年10月28日には、成功・失敗・キャッシュの別で数える `response_status` のパラメーターが加わり、既定は成功だけを数えるように変わった[^cl-analytics]。

## 自律エージェントからの接続

2026年6月から、ブラウザーでログインできない自律エージェントやボットは、Access のサービストークンでポータルにつなげる[^cl-service-token]。そのためには、ポータルと各サーバーの Access アプリケーションに同じトークンを認める Service Auth のポリシーを置き、各サーバーの Require user auth を無効にする。利用者ごとのログインを求めるサーバーは、サービストークンのセッションには出てこない[^cl-service-token]。

2026年11月2日には、Access のサービストークンに環境やチームなどのキーと値のタグを付け、そのタグでポリシーを書けるようになった[^cl-token-tags]。

## 制限

ドキュメントは2026年11月2日時点で、次の制限を挙げている[^docs]。

- 1 つのポータルに載せられる MCP サーバーは80までである
- プロキシを経由したクライアントを拒む MCP サーバーは、登録の段階で `403` を返し、使えない
- 管理者の OAuth のトークンが上流で失効すると、サーバーは利用者から見えなくなるが、管理者には通知されない
- 事前登録の OAuth クライアントを使うサーバーの道具の一覧は、最初の利用者がログインしたときにだけ取得され、その後は更新されない
- ポータル経由で上流のサーバーを認可するときは、Access の独立した多要素認証・目的の申告・一時的な認証の承認が求められない。メールアドレス・グループ・国・端末の状態などの条件は適用される

## 歴史

| 時期           | 出来事                                                                    |
| -------------- | ------------------------------------------------------------------------- |
| 2025年8月26日  | すべてのプランでオープンベータとして公開[^cl-beta]                        |
| 2026年2月27日  | Logpush に対応[^cl-logpush]                                               |
| 2026年3月20日  | managed OAuth と Gateway 経由の通信に対応[^cl-managed-oauth][^cl-gateway] |
| 2026年3月26日  | コンテキストの節約と Code Mode に対応[^cl-context][^cl-codemode]          |
| 2026年4月2日   | セッションの管理に対応[^cl-session]                                       |
| 2026年4月17日  | ブラウザー向けのホームページとサインアウトを追加[^cl-homepage]            |
| 2026年5月28日  | 道具とプロンプトの別名に対応[^cl-alias]                                   |
| 2026年6月26日  | サービストークンでの接続に対応[^cl-service-token]                         |
| 2026年7月30日  | Code Mode の 4 つの方針を追加[^cl-codemode-policy]                        |
| 2026年7月31日  | 事前登録の OAuth クライアントに対応[^cl-static-oauth]                     |
| 2026年8月25日  | MCP の仕様 `2026-07-28` に対応[^cl-spec]                                  |
| 2026年9月22日  | 私設のネットワークの MCP サーバーに対応[^cl-private]                      |
| 2026年9月24日  | 一般提供を開始[^cl-ga]                                                    |
| 2026年10月28日 | 呼び出し回数の集計を応答の状態で絞り込めるようにした[^cl-analytics]       |

## 外部リンク

- [MCP server portals（Cloudflare One のドキュメント）](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/)
- [Access の変更履歴](https://developers.cloudflare.com/cloudflare-one/changelog/access/)

[^docs]: Cloudflare「[MCP server portals](https://developers.cloudflare.com/cloudflare-one/access-controls/ai-controls/mcp-portals/)」Cloudflare One docs。2026年11月2日更新。2026年11月3日閲覧。

[^governance]: Cloudflare「[MCP governance](https://developers.cloudflare.com/agents/model-context-protocol/protocol/governance/)」Cloudflare Agents docs。2026年11月3日閲覧。

[^blog]: Cloudflare「[Securing the AI Revolution: Introducing Cloudflare MCP Server Portals](https://blog.cloudflare.com/zero-trust-mcp-server-portals/)」The Cloudflare Blog、2025年8月26日。2026年11月3日閲覧。

[^cl-beta]: Cloudflare「[MCP server portals](https://developers.cloudflare.com/changelog/post/2025-08-26-mcp-server-portals/)」Cloudflare Changelog、2025年8月26日。2026年11月3日閲覧。

[^cl-ga]: Cloudflare「[MCP server portals are now generally available](https://developers.cloudflare.com/changelog/post/2026-09-24-mcp-portals-ga/)」Cloudflare Changelog、2026年9月24日。2026年11月3日閲覧。

[^cl-private]: Cloudflare「[Private MCP server support for MCP server portals](https://developers.cloudflare.com/changelog/post/2026-09-22-private-mcp-servers/)」Cloudflare Changelog、2026年9月22日。2026年11月3日閲覧。

[^cl-spec]: Cloudflare「[MCP server portals support MCP 2026-07-28 specification](https://developers.cloudflare.com/changelog/post/2026-08-25-mcp-portals-mcp-2026-07-28/)」Cloudflare Changelog、2026年8月25日。2026年11月3日閲覧。

[^cl-static-oauth]: Cloudflare「Static OAuth client credentials for MCP server portals」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年7月31日。2026年11月3日閲覧。

[^cl-codemode-policy]: Cloudflare「Admins can turn on Code Mode by default for MCP portal users」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年7月30日。2026年11月3日閲覧。

[^cl-service-token]: Cloudflare「[Service token support for MCP server portals](https://developers.cloudflare.com/changelog/post/2026-06-26-mcp-portal-service-tokens/)」Cloudflare Changelog、2026年6月26日。2026年11月3日閲覧。

[^cl-alias]: Cloudflare「[Tool and prompt aliases for MCP server portals](https://developers.cloudflare.com/changelog/post/2026-05-28-mcp-portal-tool-prompt-aliases/)」Cloudflare Changelog、2026年5月28日。2026年11月3日閲覧。

[^cl-homepage]: Cloudflare「[Homepage and sign-out for MCP server portals](https://developers.cloudflare.com/changelog/post/2026-04-17-mcp-portal-homepage-and-sign-out/)」Cloudflare Changelog、2026年4月17日。2026年11月3日閲覧。

[^cl-session]: Cloudflare「[Session management for MCP server portals](https://developers.cloudflare.com/changelog/post/2026-04-02-mcp-portal-session-management/)」Cloudflare Changelog、2026年4月2日。2026年11月3日閲覧。

[^cl-context]: Cloudflare「[Context optimization for MCP server portals](https://developers.cloudflare.com/changelog/post/2026-03-26-mcp-portal-context-optimization/)」Cloudflare Changelog、2026年3月26日。2026年11月3日閲覧。

[^cl-codemode]: Cloudflare「Code Mode for MCP server portals」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年3月26日。2026年11月3日閲覧。

[^cl-managed-oauth]: Cloudflare「Managed OAuth for Cloudflare Access」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年3月20日。2026年11月3日閲覧。

[^cl-gateway]: Cloudflare「Route MCP server portal traffic through Cloudflare Gateway」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年3月20日。2026年11月3日閲覧。

[^cl-logpush]: Cloudflare「Export MCP server portal logs with Logpush」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年2月27日。2026年11月3日閲覧。

[^cl-analytics]: Cloudflare「Filter MCP tool-call analytics by response status」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年10月28日。2026年11月3日閲覧。

[^cl-token-tags]: Cloudflare「Organize and authorize Access service tokens with tags」[Access changelog](https://developers.cloudflare.com/cloudflare-one/changelog/access/)、2026年11月2日。2026年11月3日閲覧。
