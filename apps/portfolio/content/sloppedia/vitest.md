---
title: "Vitest"
description: "Vite の設定と変換の仕組みをそのまま使う、JavaScript と TypeScript のテストフレームワーク。Anthony Fu が2021年に始め、VoidZero のチームも開発している。2026年11月に 5.1 が出た。"
tags: ["テスト", "JavaScript", "TypeScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Anthony Fu"
  - label: "npm への初公開"
    value: "2021年12月3日"
  - label: "最新のリリース"
    value: "5.1.0（2026年11月2日）"
  - label: "土台"
    value: "Vite"
  - label: "言語"
    value: "TypeScript"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "vitest.dev"
    href: "https://vitest.dev/"
---

Vitest は、JavaScript と TypeScript のテストフレームワークである。[Vite](/sloppedia/vite) の設定とプラグインと変換の仕組みをそのまま使うので、アプリと同じ設定でテストを動かせる[^vz-cloudflare]。npm への最初の公開は2021年12月3日で、作者として Anthony Fu の名がある[^npm]。

2026年の時点では、[VoidZero](/sloppedia/voidzero) のチームも開発を担い、Vite と並んで現代の JavaScript と TypeScript の開発の既定の選択肢になっている[^vz-cloudflare]。コアへの貢献者は840人を超える[^vitest-5-1]。

## 歴史

| リリース | 時期       |
| -------- | ---------- |
| 1.0      | 2023年12月 |
| 2.0      | 2024年7月  |
| 3.0      | 2025年1月  |
| 4.0      | 2025年10月 |
| 5.0      | 2026年9月  |
| 5.1      | 2026年11月 |

日付は npm への公開日に基づく[^npm]。

## Vitest 5

2026年9月の Vitest 5 は、性能を中心に据えたリリースである[^vitest-5]。5ファイルの小さなパッケージから1,280モジュールの大きなアプリまでを並べたベンチマークを用意し、Vitest 4 と比べた[^vitest-5]。最大で50% 速くなった[^recap-sep]。

速くなった理由として、次の変更を挙げている[^vitest-5]。

- 設定を変えないプロジェクトどうしで Vite のサーバーを共有し、同じファイルを1度だけ変換する
- 変換したモジュールをディスクにキャッシュし、実行をまたいで使い回す
- 本体の処理とワーカーの間の往復を減らす
- 依存ライブラリを同梱し、インストールを小さくする

新しい `vitest doctor` コマンドは、準備・読み込み・変換・テストの時間を分けて示し、別の設定を試して速い設定を勧める[^vitest-5]。ブラウザーで動かすテストには、操作と検査の1つ1つを DOM のスナップショットとして残し、あとから1歩ずつ再生できる Trace View が入った[^vitest-5]。待ち忘れた非同期の検査を失敗にするなど、誤って通るテストも減らした[^recap-sep]。

## Vitest 5.1

2026年11月2日の Vitest 5.1 は、試験的な `--since-last-run` を入れた[^vitest-5-1]。最初の実行で各テストが読んだファイルを記録し、次からは前回の実行のあとに変わったファイルを使うテストだけを動かす[^vitest-5-1]。Git を使わないので、リポジトリでないディレクトリでも同じように働く。公式のブログは、テストを繰り返し動かす AI のコーディングエージェントに向くと説明している[^vitest-5-1]。

ほかに、失敗したスナップショットを1つずつ見て受け入れるか決める機能が入った[^vitest-5-1]。Trace View は試験的な扱いを外れ、失敗したテストを既定で記録する[^vitest-5-1][^recap-oct]。

## 使われ方

Miro は、7万件のテストを Jest から Vitest へ AI のエージェントの助けを借りて約2か月で移した[^recap-oct]。テストは50% 速くなり、ヒープの使用量は65% 減ったという[^recap-oct]。Linear も、CI の見直しで Vitest の `isolate: false` が最大の効果を生んだと報告している[^recap-oct]。

[Vite+](/sloppedia/vite-plus) は、`vp test` で Vitest を動かす[^vite-plus-1]。

[^npm]: npm「[vitest](https://www.npmjs.com/package/vitest)」。2026年11月7日に閲覧。

[^vitest-5]: Vitest「[Vitest 5.0 is out!](https://vitest.dev/blog/vitest-5)」2026年9月。

[^vitest-5-1]: Vitest「[Vitest 5.1 is out!](https://vitest.dev/blog/vitest-5-1)」2026年11月2日。

[^vz-cloudflare]: Evan You「[VoidZero is joining Cloudflare](https://voidzero.dev/posts/voidzero-cloudflare)」VoidZero、2026年6月4日。

[^vite-plus-1]: VoidZero「[Announcing Vite+ 1.0](https://voidzero.dev/posts/announcing-vite-plus-1-0)」2026年9月28日。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
