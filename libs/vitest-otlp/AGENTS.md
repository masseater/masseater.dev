# @r_masseater/vitest-otlp

このワークスペースは Vitest のプラグインである。コードがテスト中に送信するテレメトリを受け取り、テストで実際に何が送信されたかを確認できるようになっている。

- Vite+ と Node.js 26 以降のみを前提とすること。`vite-plus` はピア依存関係とし、他の環境向けの分岐は追加しないこと。
- `vp run generate` で protobuf コードを再生成すること。手動で編集しないこと。
- 本パッケージまたは推奨事項を変更した際は、masseater/skills の `measure-everything` スキルも更新すること。
