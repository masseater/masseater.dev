---
title: "VoidZero"
description: "Vite の作者の Evan You が2023年に始めた、JavaScript の開発ツールを作る会社。Vite、Vitest、Rolldown、Oxc、Vite+ を開発し、2026年6月に Cloudflare に加わった。"
tags: ["企業", "JavaScript", "開発ツール", "Cloudflare", "2026年のソフトウェア"]
published: true
infobox:
  - label: "正式名称"
    value: "VoidZero Inc."
  - label: "創業者"
    value: "Evan You"
  - label: "創業"
    value: "2023年（公表は2024年10月1日）"
  - label: "資金"
    value: "シード 460万ドル（Accel が主導）、シリーズ A（Accel が主導）"
  - label: "親会社"
    value: "Cloudflare（2026年6月4日から）"
  - label: "開発するもの"
    value: "Vite、Vitest、Rolldown、Oxc、Vite+、Void"
  - label: "ライセンス"
    value: "オープンソースのものはすべて MIT License"
  - label: "URL"
    value: "voidzero.dev"
    href: "https://voidzero.dev/"
---

VoidZero は、JavaScript の開発ツールを作る会社である。Vue.js と [Vite](/sloppedia/vite) の作者の Evan You が2023年に始め、2024年10月1日に公表した[^founding][^vz-cloudflare]。速く、ひとまとまりで使える開発ツール群を JavaScript の生態系全体に届けることを目標にしている[^founding]。

Vite、[Vitest](/sloppedia/vitest)、[Rolldown](/sloppedia/rolldown)、[Oxc](/sloppedia/oxc)、[Vite+](/sloppedia/vite-plus) を開発し、すべて MIT License で公開している[^vz-cloudflare]。2026年6月4日、Cloudflare に加わった[^vz-cloudflare][^cf-acquisition]。

## 歴史

### 創業

Evan You は2016年から2023年まで、寄付を受けながら独立して Vue と Vite を開発していた[^vz-cloudflare]。Vite のために Rolldown の設計を始め、その下の層を掘るうちに、Vite の抱える問題は JavaScript の生態系全体の断片化を映していると考えるようになった[^founding]。生態系全体のツールを作るには専任のチームが要り、寄付では足りないので、ベンチャーキャピタルから資金を集める道を選んだ[^vz-cloudflare]。

2024年10月1日の公表では、Accel が主導するシードで460万ドルを集めたと述べた[^founding]。のちのシリーズ A も Accel の Casey Aylward が主導した。Peak XV、Sunflower Capital、Amplify Partners、PWV なども出資している[^vz-cloudflare]。

公表の時点で、作るツールの性質として次の4つを掲げた[^founding]。

| 性質             | 中身                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| Unified          | 解析、変換、lint、整形、バンドル、圧縮、テストで同じ構文木と解決器を使う |
| High Performance | ネイティブにコンパイルする言語で書き、並列に動かす                       |
| Composable       | 部品を1つずつ取り出して使える                                            |
| Runtime Agnostic | 特定の JavaScript の実行環境に縛られない                                 |

### 収益化の模索

VoidZero は、ツールの利用が広がる一方で収益の道を見つけられなかった[^vz-cloudflare]。2025年10月に発表した Vite+ は、当初は企業に有料のライセンスを売る計画だったが、公開の前にやめ、MIT License で公開した[^vite-plus-announce][^vz-cloudflare]。代わりに、Cloudflare の上で Vite のアプリをそのままデプロイできる基盤 Void を作り始めた[^vz-cloudflare]。

ただ、Void を作るには、もともと少ない人員を2つに割る必要があった[^vz-cloudflare]。クラウドの基盤は、ツールとは別の分野でもあった[^vz-cloudflare]。

### Cloudflare への合流

2026年6月4日、VoidZero は Cloudflare に加わると発表した[^vz-cloudflare][^cf-acquisition]。Vite の Environment API や Cloudflare の Vite プラグインで、買収の話より前から協力していた[^vz-cloudflare]。

両社は、どのプロジェクトも MIT License のオープンソースのまま特定の事業者に依存しないこと、Evan You のチームが引き続き率いることを約束した[^cf-acquisition]。Cloudflare は、Vite の生態系の保守者を支える100万ドルの基金も設けた。基金は Vite のコアチームが運営する[^cf-acquisition]。Evan You は、AI のエージェントがツールを使う場面が増えたことも合流の理由に挙げている[^vz-cloudflare]。

合流から4か月で80を超えるリリースを出し、1,200を超える Issue を閉じた[^recap-sep]。Hono の作者の Yusuke Wada もチームに加わった[^recap-sep]。

## 開発しているもの

| 名前                            | 中身                                                                |
| ------------------------------- | ------------------------------------------------------------------- |
| [Vite](/sloppedia/vite)         | Web のフロントエンドのビルドツール                                  |
| [Vitest](/sloppedia/vitest)     | Vite の上で動くテストフレームワーク                                 |
| [Rolldown](/sloppedia/rolldown) | Rust で書いたバンドラー。Vite 8 の既定のバンドラー                  |
| [Oxc](/sloppedia/oxc)           | Rust で書いた JavaScript の言語処理の部品集。Oxlint と Oxfmt を含む |
| [Vite+](/sloppedia/vite-plus)   | 上の道具を1つのコマンド `vp` にまとめたツールチェーン               |
| Void                            | Cloudflare の上で動く、Vite のアプリのデプロイの基盤                |

Rolldown の公式のプロジェクトとして、ライブラリ向けのバンドラーの [tsdown](/sloppedia/tsdown) もある[^tsdown]。2026年10月には、Oxc の配下で TypeScript のコンパイラーを Rust に移す [tsrs](/sloppedia/tsrs) を公開した[^recap-oct]。同じ月に Void もオープンソースになった[^recap-oct]。

## チーム

公式サイトは、Evan You のほか、Oxc の作者の Boshen Chen や Jest の作者の Christoph Nakazawa を挙げている[^about]。Vitest の Vladimir Sheremet、開発者向けの広報を担う Alexander Lichter、Oxc の Yuji Sugiura もいる[^about]。

月ごとの活動は、Alexander Lichter がブログの「Tales from the Void」にまとめている[^recap-oct]。オンラインの会議 ViteConf も開いており、2026年は10月15日に開いた[^recap-jul][^recap-oct]。

[^founding]: Evan You「[Announcing VoidZero Inc.](https://voidzero.dev/posts/announcing-voidzero-inc)」VoidZero、2024年10月1日。

[^vz-cloudflare]: Evan You「[VoidZero is joining Cloudflare](https://voidzero.dev/posts/voidzero-cloudflare)」VoidZero、2026年6月4日。

[^cf-acquisition]: Evan You、Steve Faulkner「[VoidZero joins Cloudflare](https://blog.cloudflare.com/voidzero-joins-cloudflare/)」Cloudflare Blog、2026年6月4日。

[^vite-plus-announce]: VoidZero「[Announcing Vite+](https://voidzero.dev/posts/announcing-vite-plus)」2025年10月13日。

[^tsdown]: tsdown「[Introduction](https://tsdown.dev/guide/)」。2026年11月7日に閲覧。

[^about]: VoidZero「[About](https://voidzero.dev/about)」。2026年11月7日に閲覧。

[^recap-jul]: Alexander Lichter「[Tales from the Void: July 2026 Recap](https://voidzero.dev/posts/whats-new-jul-2026)」VoidZero、2026年8月12日。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
