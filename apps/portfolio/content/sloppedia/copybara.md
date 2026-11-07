---
title: "Copybara"
description: "Google が公開している、リポジトリの間でコードを変換しながら写す道具。社内の単一のリポジトリと GitHub の公開リポジトリを同期させるのに使う。"
tags: ["Google", "バージョン管理システム", "モノレポ", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Google"
  - label: "言語"
    value: "Java"
  - label: "設定の言語"
    value: "Starlark"
  - label: "ライセンス"
    value: "Apache License 2.0"
  - label: "最新のスナップショット"
    value: "v20261102（2026年11月2日）"
  - label: "URL"
    value: "github.com/google/copybara"
    href: "https://github.com/google/copybara"
---

Copybara は、リポジトリの間でコードを変換しながら写す道具である。Google が社内で使っているものを公開している[^readme]。社内の [Piper](/sloppedia/piper) のリポジトリにあるコードを GitHub に出したり、GitHub で受けた貢献を社内に取り込んだりするのに使う。

## 考え方

Copybara は、複数のリポジトリのうち1つを正の情報源として決めることを求める。貢献はどのリポジトリで受けてもよく、正のリポジトリを通して他のリポジトリに行き渡る[^readme]。たとえば、非公開のリポジトリのコードを公開のリポジトリに写し、逆に公開のリポジトリで受けた変更を非公開のリポジトリに取り込む[^readme]。

Copybara は自分で状態を持たない。どこまで写したかは、写し先のコミットのメッセージにラベルとして残す[^readme]。

## 設定

写し方は Starlark で書いた設定ファイルに `core.workflow` として定義する。写すときに、文字列の置き換え（`core.replace`）やファイルの移動（`core.move`）などの変換をかけられる[^readme]。社内でしか使わない部分を消したり、パスを公開用に組み替えたりできる。

対応する写し元と写し先は Git だけで、Mercurial の読み取りは試験的な対応である[^readme]。

## 公開リポジトリの痕跡

Google が GitHub で公開しているリポジトリには、Copybara で社内から写したコミットが多い。たとえば Abseil のコミットには、社内の変更番号を示す `PiperOrigin-RevId` の行が付いている[^abseil]。開発の本体は社内の単一のリポジトリにあり、GitHub は写しの1つだということが、この行から分かる。

## 開発の状況

正式なリリースは無く、master ブランチから毎週テスト用のスナップショットが自動で作られる。スナップショットは版の互換性や正しさを保証しない[^releases]。2026年11月7日の時点の最新は、11月2日の v20261102 である[^releases]。master には11月6日にもコミットが入っている[^commits]。

## 関連

Copybara は、単一のリポジトリで開発しながら、オープンソースの文化に合わせてプロジェクトごとのリポジトリも持つための道具といえる。この緊張関係は[モノレポとポリレポ](/sloppedia/monorepo-and-polyrepo)の記事で扱っている。

[^readme]: Google「[Copybara](https://github.com/google/copybara)」GitHub。2026年11月7日に閲覧。

[^releases]: Google「[Releases](https://github.com/google/copybara/releases)」Copybara、GitHub。2026年11月7日に閲覧。

[^commits]: Google「[Commits](https://github.com/google/copybara/commits/master)」Copybara、GitHub。2026年11月7日に閲覧。

[^abseil]: Abseil「[abseil-cpp](https://github.com/abseil/abseil-cpp)」GitHub。2026年11月7日の最新のコミットで確認。
