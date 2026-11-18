---
title: "Python を使わない曲マネージャー yogoto（2026年11月18日時点）"
description: "曲を取り込んでステム分離し、拍とキーを解析するデスクトップアプリ yogoto を Rust だけで作っている。モデル推論、音声のダウンロード、デコードの Python 依存を置き換えたときに分かったことを記録する。"
tags: ["Rust", "音楽", "yogoto"]
published: true
---

yogoto は、僕が曲を管理するために作っているデスクトップアプリである。YouTube やニコニコ動画や SoundCloud のリンク、手元の音声ファイルを入れると、元の音声を再エンコードせずに保管する。そのうえで BS-RoFormer のモデルでステムに分離し、拍と小節とキーを解析する。アプリは `127.0.0.1` で MCP サーバーを立てていて、AI はそこから取り込みと分離を頼み、結果を読める。コードは masseater.dev の [apps/yogoto](https://github.com/masseater/masseater.dev/tree/main/apps/yogoto) にある。

アプリはすべて Rust で書き、Python は使っていない。モデル推論、音声のダウンロード、音声のデコードは Python のエコシステムで済ませるのが普通の部分だった。このメモには、それぞれを置き換えたときに分かったことを残す。

| 工程         | 動かしているもの                                            | 避けた Python の相当品 |
| ------------ | ----------------------------------------------------------- | ---------------------- |
| ダウンロード | 自前の Rust の抽出器。失敗したらバージョンを固定した yt-dlp | yt-dlp                 |
| 分離         | candle で実装した BS-RoFormer                               | PyTorch、ONNX への変換 |
| 拍と小節     | rten で動く Beat This! の Rust 移植                         | beat_this              |
| キー         | ONNX に書き出した S-KEY を rten で動かす                    | skey                   |
| デコード     | symphonia と、Opus 用の opus-rs                             | ffmpeg                 |

## BS-RoFormer は candle でチェックポイントを直接読む

BS-RoFormer 系の分離モデルは、PyTorch のチェックポイントと YAML の設定で公開されている。ONNX に変換するには Python が要るので、candle 0.11 でネットワークを実装し、`.ckpt` と `.yaml` をそのまま読ませた。重みは Hugging Face からリビジョンを固定して取る。既定のモデルは BS-RoFormer SW で、bass、drums、other、vocals、guitar、piano の6本のステムを出す[^bs-rofo-sw]。

テストでは、固定したリビジョンの重みと PyTorch の出力を取ってきて両者を比べている。最初は出力が一致しなかった。原因はスペクトログラムの DC 成分を0にする `zero_dc` という設定だった。分離のテストは CPU で243秒かかっていた。読み込み済みの分離器を関数へ渡す形に変え、テストのチャンクを短くしたところ、約21秒になった。

もっと新しいモデルがないかも確かめた。重みが公開されている最新のモデルは、2026年11月8日に出た ZFTurbo の学習コード v1.0.23 の SubRoformer だった。Multisong の平均スコアは10.45で、SW を下回る。BS Roformer 124 bands 2026.07 のようにスコアが最も高いモデルは MVSep の有料サービスでしか使えず、重みは公開されていない[^mvsep-algorithms]。

## 自前のダウンローダーはクラウドで yt-dlp の4〜15倍速い

yt-dlp は Python で書かれているので、サイトごとの抽出器を Rust で書き、クラウドのコンテナで両方を測った。各セルは5回の中央値で、プロセスの起動からファイルを書き終えるまでの時間である。

| サイト                         | yt-dlp onefile | yt-dlp onedir、`-N 8` | Rust   |
| ------------------------------ | -------------- | --------------------- | ------ |
| YouTube、3.4 MB の Opus        | 14.1秒         | 19.5秒                | 0.94秒 |
| ニコニコ動画、HLS 54セグメント | 5.6秒          | 4.0秒                 | 3.4秒  |
| SoundCloud、AAC の HLS         | 4.1秒          | 3.7秒                 | 1.4秒  |

YouTube の差はほとんどがリクエストの数から来ている。yt-dlp は視聴ページとプレイヤーの JavaScript を読み込み、Deno でチャレンジを解く。データセンターの IP からだと Web クライアントは403や429を受けて再試行を繰り返す。Rust の側は visionOS クライアントとして InnerTube に1回だけリクエストを送る。返ってくるのは暗号化されていない直接の URL で、それを 1 MiB ずつの Range リクエストで並列に取る。Range ヘッダーのない普通の GET は約 32 KB/s に絞られる。YouTube とニコニコ動画のファイルは yt-dlp の出力とバイト単位で一致した。

Rust の側が扱えるのはよくある場合だけである。子ども向けの動画、年齢制限のある動画、メンバー限定の動画、ライブ配信は再生できない。1つのクライアントが予告なく使えなくなることもある。そのため、自前の取得に失敗したときは、バージョンと SHA-256 で固定した yt-dlp 公式の onedir ビルドを落としてきて代わりに使う。どちらの経路を通ったかと、自前の取得が失敗した理由は tracing の span に記録している。

## symphonia は Opus をデコードできない

YouTube の音声は WebM に入った Opus で届くが、symphonia 0.6 には Opus のデコーダーがない。そこで Opus のパケットは opus-rs でデコードし、OpusHead ヘッダーの10〜11バイト目にある pre-skip の数だけ先頭のサンプルを捨てている。これを捨てないと、デコードした音声の先頭に余計なサンプルが付き、元の音声と位置がずれる。

ステムは 24 bit の FLAC で書き出す。最初に試したエンコーダーの flacenc は、symphonia で読めないファイルを作った。そこで flac-codec に切り替えた。浮動小数点を `32767 * 256` 倍していたときは、書いて読み戻すと 1.5e-5 の誤差が残った。2の23乗倍にしてクランプすると誤差は消えた。

## 拍とキーのモデルは rten で動く

[Beat This! の Rust 移植](https://github.com/danigb/beat-this-rs)は、Rust で書かれたランタイムの rten で ONNX のモデルを動かし、システムのライブラリを必要としない[^beat-this-rs]。拍と小節の頭の時刻を返すので、yogoto は小節の頭から小節を組み立てる。合成した30秒の曲では、フルサイズのモデルが CPU で約3秒かかった。

キーの判定には Deezer の S-KEY を ONNX に書き出したものを使う。特徴量の抽出までグラフに入っているので、22,050 Hz の生の音声を渡すと24個の確率が返る。ファイルは 0.33 MB で、同じ rten で動く。書き出した人の説明によると、ボーカルだけを渡すと本来のキーと平行調を同じくらいの頻度で返すので、伴奏のステムに使う想定である[^skey-onnx]。yogoto はボーカル以外のステムを足し合わせ、8小節ごとにキーを推定する。転調した箇所は範囲として現れる。

Aメロやサビのような構成の判定には SongFormer を候補にしている。ONNX に書き出したものはあるが、MuQ と MusicFM という約 410 MB のエンコーダーが2つ要る。MuQ の重みは非営利の利用に限ったライセンスである[^songformer-onnx]。

## クラウドのコンテナはメモリより先にディスクが尽きる

クラウドのセッションには、書き込めるディスクが約 39 GB、メモリが 15 GB ある。モノレポの Rust の検査を一度に全部走らせると `target/debug` がディスクを埋め、push が `No space left on device` で失敗した。ワークスペースごとに1つずつ検査を走らせ、その合間に `target/debug` を消すと push が通った。タスクランナーがキャッシュした結果を再生するからである。

[^bs-rofo-sw]: [enerjazzer/BS-ROFO-SW-Fixed](https://huggingface.co/enerjazzer/BS-ROFO-SW-Fixed)

[^mvsep-algorithms]: [MVSep algorithms](https://mvsep.com/en/algorithms)

[^beat-this-rs]: [beat-this-rs](https://github.com/danigb/beat-this-rs)

[^skey-onnx]: [musetric/skey-onnx](https://huggingface.co/musetric/skey-onnx)

[^songformer-onnx]: [akineAItech/CUE-Uttaro-SongFormer-ONNX](https://huggingface.co/akineAItech/CUE-Uttaro-SongFormer-ONNX)
