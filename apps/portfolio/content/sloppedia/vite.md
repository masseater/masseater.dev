---
title: "Vite"
description: "Evan You が2020年に作った、Web のフロントエンドのビルドツール。開発中はブラウザーの ES モジュールで変換したファイルを配り、本番向けにはバンドルする。2026年の Vite 8 でバンドラーを Rolldown に一本化した。"
tags: ["ビルドツール", "JavaScript", "フロントエンド", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Evan You"
  - label: "開発"
    value: "Vite チーム、VoidZero"
  - label: "npm への初公開"
    value: "2020年4月21日"
  - label: "最新のリリース"
    value: "8.3.6（2026年11月5日）"
  - label: "バンドラー"
    value: "Rolldown（Vite 8 から）"
  - label: "言語"
    value: "TypeScript"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "vite.dev"
    href: "https://vite.dev/"
---

Vite は、Web のフロントエンドのビルドツールである。開発用のサーバーと本番向けのビルドを1つにまとめ、Vue、SvelteKit、Nuxt、Astro、Solid など多くのフレームワークの内部で使われている[^why][^cf-acquisition]。作者は Vue.js の作者でもある Evan You で、2026年の時点では [VoidZero](/sloppedia/voidzero) のチームが開発を率いている[^vz-cloudflare]。

2026年3月の Vite 8 で、それまで使い分けていた2つのバンドラーを [Rolldown](/sloppedia/rolldown) に一本化した[^vite8]。週に1億回以上ダウンロードされている[^vz-cloudflare]。

## 仕組み

Vite が生まれたころ、ブラウザーは ES モジュールを広く読めるようになっていた[^why]。それまでのビルドツールは、開発中もアプリ全体を1つにまとめてから配っていたので、大きなアプリでは起動と更新が遅かった[^why]。

Vite は仕事を2つに分けた。あまり変わらない依存ライブラリは、速いネイティブのツールで一度だけ前もってまとめる。頻繁に変わるアプリのコードは、ブラウザーが求めたファイルだけをその場で変換して ES モジュールのまま配る[^why]。そのため開発サーバーはアプリの大きさによらずすぐ起動し、編集したモジュールだけを差し替える HMR もすぐ効く[^why]。

Vite 7 までは、開発中の変換と依存のまとめに esbuild を、本番のバンドルに Rollup を使っていた[^vite8]。変換の流れとプラグインの仕組みが2つずつあり、両者の挙動の差を埋める糸のようなコードが増えていた[^vite8]。

## 歴史

| リリース | 時期       | 中身                                                            |
| -------- | ---------- | --------------------------------------------------------------- |
| 最初     | 2020年4月  | npm に初めて公開された[^npm]                                    |
| 2.0      | 2021年2月  | フレームワークを問わない形に作り直した[^npm]                    |
| 6.0      | 2024年11月 | 2024年11月26日に出た[^npm]                                      |
| 7.0      | 2025年6月  | 2025年6月24日に出た[^npm]                                       |
| 8.0      | 2026年3月  | バンドラーを Rolldown に一本化した[^vite8]                      |
| 8.1      | 2026年6月  | 開発中もバンドルする Bundled Dev Mode を試験的に入れた[^vite81] |
| 8.3      | 2026年9月  | 2026年9月10日に出た[^npm]                                       |

### Vite 8

Rolldown への移行は段階を踏んだ。2025年5月に別のパッケージ rolldown-vite を技術プレビューとして出し、2025年12月に Rolldown を組み込んだ Vite 8 のベータを出した[^vite8][^rolldown-1]。2026年3月12日に安定したリリースを出した[^vite8]。

これで、ビルドツールの Vite、バンドラーの Rolldown、コンパイラーの [Oxc](/sloppedia/oxc) が、互いに近いチームの作る1つの流れになった[^vite8]。先行して試した企業では、Linear の本番ビルドが46秒から6秒に、Beehiiv のビルドの時間が64% 短くなった[^vite8]。

Vite 8 はほかにも、開発用の道具 Vite Devtools、tsconfig のパスの別名の解決、`emitDecoratorMetadata` を入れた。ブラウザーのコンソールの出力を開発サーバーの端末へ転送する機能もあり、コーディングエージェントが使っていると分かると自動で有効になる[^vite8]。

### Bundled Dev Mode

アプリが大きくなると、ファイルごとに配る方式ではブラウザーへの要求が増え、起動と再読み込みが遅くなる[^vite81]。Vite 8.1 は、本番と同じように開発中もバンドルする Bundled Dev Mode を試験的に入れた[^vite81]。1万個の React のコンポーネントを読むアプリでは、起動が約15倍、全体の再読み込みが約10倍速くなった[^vite81]。

2026年9月には、Vite の試験用のアプリ群のすべてがこのモードで動くようになった[^recap-sep]。OpenCode のデスクトップアプリもこのモードで開発している[^recap-sep]。

## 2026年の動き

Vite 8 は、出てから数か月で Vite 6 と 7 を合わせたよりも多くダウンロードされた[^recap-jul]。8月には、React Compiler を Babel なしで Oxc で動かせるようになった[^recap-aug]。10月には、`create-vite` が新しいプロジェクトに [TypeScript 7](/sloppedia/typescript-7) を使うようになり、Vite のリポジトリ自身も lint を [Oxlint](/sloppedia/oxlint) に移した[^recap-oct]。

[^why]: Vite「[Why Vite](https://vite.dev/guide/why)」。2026年11月7日に閲覧。

[^npm]: npm「[vite](https://www.npmjs.com/package/vite)」。2026年11月7日に閲覧。

[^vite8]: Vite「[Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8)」2026年3月12日。

[^vite81]: Vite「[Vite 8.1 is out!](https://vite.dev/blog/announcing-vite8-1)」2026年6月23日。

[^rolldown-1]: VoidZero「[Announcing Rolldown 1.0](https://voidzero.dev/posts/announcing-rolldown-1-0)」2026年5月7日。

[^vz-cloudflare]: Evan You「[VoidZero is joining Cloudflare](https://voidzero.dev/posts/voidzero-cloudflare)」VoidZero、2026年6月4日。

[^cf-acquisition]: Evan You、Steve Faulkner「[VoidZero joins Cloudflare](https://blog.cloudflare.com/voidzero-joins-cloudflare/)」Cloudflare Blog、2026年6月4日。

[^recap-jul]: Alexander Lichter「[Tales from the Void: July 2026 Recap](https://voidzero.dev/posts/whats-new-jul-2026)」VoidZero、2026年8月12日。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
