# Architecture Overview

Rust 製の開発タスクランナーである。cargo xtask から呼ぶ。実処理は nice-plug-xtask へ委譲する薄い層になっている。

## 1. 中心の部品

### bundle-all

説明: apps 配下から cdylib なクレートを自動で検出する。全プラグイン分の bundle をまとめて実行する。

### bundle-universal-all

説明: 同じ検出で bundle-universal をまとめて実行する。macOS の universal バイナリ向けである。

## 2. 不変条件

対象の検出: プラグインの一覧は手で持たない。apps 配下のマニフェストから cdylib を含むものを拾う。プラグインが増減してもこのツールのコードは変わらない。
