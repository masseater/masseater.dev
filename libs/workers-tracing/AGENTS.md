# @r_masseater/workers-tracing

このワークスペースでは、Effect、TanStack Start、Elysia のスパンを Cloudflare Workers が作成するトレースに格納する。

- Vite+ と Node.js 26 以降のみを前提とすること。`vite-plus` はピア依存関係とし、他の環境向けの分岐は追加しないこと。
- 本パッケージまたは推奨事項を変更した際は、masseater/skills の `measure-everything` スキルも更新すること。
