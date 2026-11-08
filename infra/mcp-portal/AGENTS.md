# Architecture Overview

上流 MCP サーバー群を1つの入口に集約する。Cloudflare Access の MCP ポータルの IaC である。

## 1. システムの概略図

```text
[クライアント] --> [Access（mcp.masseater.dev）] --> [上流 MCP 群]
```

## 2. 中心の部品

### ポータル

説明: 複数の上流 MCP サーバーを単一のエンドポイントの背後に並べる。

### Access アプリケーション

説明: ポータルへの入口の認証と認可を担う。

### Managed OAuth

説明: クライアントの接続に使う OAuth の発行まわりを担う。動的クライアント登録（DCR）を受け付ける。

## 3. 外部の連携

集約する対象: personal、watashi、mirucord、medley、twilog（2系統）、atra、sepiace、flovia。

## 4. セキュリティ

認証: Cloudflare Access の Managed OAuth。
公開範囲: オーナー本人のみである。Access のポリシーで第三者へは開かない。

## 5. デプロイと基盤

基盤: Cloudflare Workers / Access。
CI/CD: GitHub Actions の deploy ジョブから Alchemy で適用する。
デプロイ先: mcp.masseater.dev。

## 6. 用語集

DCR: Dynamic Client Registration の略である。クライアントが接続時に自分を登録する仕組みを指す。
