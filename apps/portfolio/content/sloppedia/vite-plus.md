---
title: "Vite+"
description: "VoidZero が作った、Web 開発のツールを1つのコマンド vp にまとめたツールチェーン。Node.js とパッケージマネージャーの管理から、lint、整形、テスト、ビルドまでを受け持つ。2026年9月に 1.0 が出た。"
tags: ["開発ツール", "JavaScript", "TypeScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "VoidZero"
  - label: "発表"
    value: "2025年10月13日"
  - label: "安定リリース"
    value: "1.0（2026年9月28日）"
  - label: "最新のリリース"
    value: "1.5.0（2026年11月4日）"
  - label: "コマンド"
    value: "vp"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "viteplus.dev"
    href: "https://viteplus.dev/"
---

Vite+ は、Web 開発のツールを1つのコマンド `vp` にまとめたツールチェーンである[^vite-plus-1]。Node.js の実行環境とパッケージマネージャーを管理し、[Vite](/sloppedia/vite)、[Vitest](/sloppedia/vitest)、[Rolldown](/sloppedia/rolldown)、[tsdown](/sloppedia/tsdown)、[Oxlint](/sloppedia/oxlint)、[Oxfmt](/sloppedia/oxfmt) を1つの組として束ねる[^beta]。

[VoidZero](/sloppedia/voidzero) が作り、MIT License で公開している[^vite-plus-1]。依存を1つと設定ファイルを1つ置けば、vite、vitest、eslint、prettier、tsup、turbo を組み合わせていた環境を置き換えられる[^recap-sep]。

## 歴史

VoidZero は2025年10月13日に Vite+ を発表した[^announce]。当初は、スタートアップと大企業に有料のライセンスを売る計画だった[^announce]。個人、オープンソース、小さな会社は無料にするつもりだった[^announce]。この計画は公開の前にやめ、MIT License で誰でも無料で使えるようにした[^announce]。Evan You は、混ぜたライセンスは「しっくりこなかった」と振り返っている[^vz-cloudflare]。

npm の `vite-plus` の 0.1.0 は2026年3月6日に出た[^npm]。2026年7月2日、ベータになった[^beta]。その時点で1,300を超える公開のリポジトリが依存していた[^beta]。2026年9月28日に 1.0 が出た。週のダウンロードは200万を超えていた[^vite-plus-1][^recap-sep]。

## コマンド

| コマンド  | 中身                                                 |
| --------- | ---------------------------------------------------- |
| `create`  | 新しいプロジェクトを作る                             |
| `install` | 依存を入れる                                         |
| `dev`     | Vite の開発サーバーを動かす                          |
| `check`   | Oxfmt の整形、Oxlint の lint、型の検査をまとめて行う |
| `test`    | Vitest でテストする                                  |
| `build`   | Vite でビルドする                                    |
| `pack`    | tsdown でライブラリをまとめる                        |
| `run`     | [Vite Task](/sloppedia/vite-task) でタスクを動かす   |
| `env`     | Node.js の実行環境を管理する                         |

表は 1.0 の告知に基づく[^vite-plus-1]。既存のプロジェクトは `vp migrate` で移せる。tsup を使うプロジェクトの移行にも対応した[^recap-aug]。

同じコマンドが、手元と CI のどちらでも、人とコーディングエージェントのどちらにも同じように働く[^recap-sep]。VoidZero はこれを利点に挙げている[^recap-sep]。GitHub Actions と GitLab の CI でも使える[^recap-sep]。

## 1.0 のあと

1.2 は、認証の要る非公開の npm のレジストリに対応した[^recap-oct]。`vpx` は [Oxc](/sloppedia/oxc) の oxc-node を使って TypeScript のファイルを直接動かせるようになり、ファイルを見張る `--watch` も入った[^recap-oct]。`vp check --deny-warnings` は、lint の警告をエラーとして扱う[^recap-oct]。

Dify、vinext、Tiptap が使っており、Laravel のスターターキットはすべて Vite+ を同梱している[^recap-sep]。Hono は Vite+ に移り、lint と整形の時間を合わせて8.22秒から1.60秒に縮めた[^recap-sep]。

[^announce]: VoidZero「[Announcing Vite+](https://voidzero.dev/posts/announcing-vite-plus)」2025年10月13日。

[^beta]: VoidZero「[Announcing Vite+ Beta](https://voidzero.dev/posts/announcing-vite-plus-beta)」2026年7月2日。

[^vite-plus-1]: Alexander Lichter ほか「[Announcing Vite+ 1.0](https://voidzero.dev/posts/announcing-vite-plus-1-0)」VoidZero、2026年9月28日。

[^npm]: npm「[vite-plus](https://www.npmjs.com/package/vite-plus)」。2026年11月7日に閲覧。

[^vz-cloudflare]: Evan You「[VoidZero is joining Cloudflare](https://voidzero.dev/posts/voidzero-cloudflare)」VoidZero、2026年6月4日。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
