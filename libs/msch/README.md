# @r_masseater/msch

msch は、masseater のリポジトリで共有している検査の方針をまとめたパッケージである。Vite+ と Node.js 26 以降を前提とする。

エージェント向けのガイダンスは、TanStack Intent のスキルとしてパッケージに同梱している。`vp exec intent load @r_masseater/msch#<skill>` で読み込む。

| スキル               | 使う場面                               |
| -------------------- | -------------------------------------- |
| `msch-checks`        | msch を実行し、その指摘に対応するとき  |
| `repository-config`  | ルートの `vite.config.ts` を組むとき   |
| `workspace-settings` | 1 つのワークスペースの設定を変えるとき |

このパッケージには次の入口がある。

| 入口                                   | 中身                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `msch`（bin）                          | リポジトリに対してすべての検査を実行する                |
| `@r_masseater/msch/config`             | ルートの `vite.config.ts` を組む `repositoryConfig`     |
| `@r_masseater/msch/workspace-settings` | 各ワークスペースの設定を読み込む `workspaceSettings`    |
| `@r_masseater/msch/lint`               | oxlint のプリセットとルールセット                       |
| `@r_masseater/msch/oxlint`             | msch の指摘を oxlint の診断として報告する JS プラグイン |
| `@r_masseater/msch/decision-rules`     | プリセットが読み込む decision ルールのプラグイン        |

## 公開先

- npm: [@r_masseater/msch](https://www.npmjs.com/package/@r_masseater/msch)
