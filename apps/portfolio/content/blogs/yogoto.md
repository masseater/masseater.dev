---
title: "yogoto, Pythonを使わない楽曲管理ツール（2026年11月18日時点）"
description: "曲をインポートし、ステムに分割してビートやキーを解析するデスクトップアプリ「yogoto」を、すべてRustで開発している。これは、モデル推論、音声ダウンロード、およびデコードのPython依存関係を置き換える際に学んだことを記録したものである。"
tags: ["Rust", "音楽", "yogoto"]
published: true
---

yogotoは、曲を管理するために作っているデスクトップアプリだ。YouTubeやニコニコ、SoundCloudのリンク、あるいは自身の端末にある音声ファイルを渡すと、元の音声を再エンコードせずに保存される。次に、BS-RoFormerモデルを用いてステムに分割し、ビート、バー、キーを解析する。アプリは `127.0.0.1` でMCPサーバーを稼働させており、AIはそこから曲のインポートや分離を行い、結果を読み取るよう指示できる。コードは masseater.dev の [apps/yogoto](https://github.com/masseater/masseater.dev/tree/main/apps/yogoto) にある。

アプリ全体がRustで書かれており、Pythonは使用していない。モデルの推論、音声のダウンロード、および音声のデコードは、通常Pythonエコシステムで扱われていた部分だった。このメモには、それぞれを置き換える際に学んだことが記録されている。

| ステップ       | 何で動くのか                                                           | 避けたPython版        |
| -------------- | ---------------------------------------------------------------------- | --------------------- |
| ダウンロード中 | Rustで自作のエクストラクター。失敗するとバージョン固定のyt-dlpに戻る。 | yt-dlp                |
| 分離           | BS-RoFormerをローソク足で実装                                          | PyTorch、ONNXへの変換 |
| Beats and bars | rten上で動作するBeat This!のRust移植版                                 | beat_this             |
| キー           | S-KEYをONNXにエクスポートし、rtenで実行中                              | skey                  |
| デコーディング | シンフォニア、およびOpus用のopus-rs                                    | ffmpeg                |

## BS-RoFormerはチェックポイントをキャンドルで直接読み取る

BS-RoFormer 系の分離モデルは、YAML 設定付きの PyTorch チェックポイントとして公開されている。ONNXへの変換にはPythonが必要なので、ネットワークはキャンドル 0.11 で実装し、`.ckpt` と `.yaml` ファイルはそのまま読み込ませた。重みはリビジョンを固定した状態でHugging Faceから取得している。デフォルトモデルはBS-RoFormer SWで、ベース、ドラム、その他、ボーカル、ギター、ピアノの6つのステムを出力する[^bs-rofo-sw]。

テストでは、固定リビジョンとPyTorchの出力の重みを取得し、両者を比較する。最初は出力が一致しなかった。原因は `zero_dc` という設定で、スペクトログラムの DC 成分を 0 に設定するものだった。分離テストのCPU実行時間は243秒だった。既にロード済みの区切り文字を関数に渡すように変更し、テストチャンクを短縮したところ、21秒ほどかかった。

新しいモデルがあるかどうかも確認した。重みが公開された最新モデルは、2026年11月8日にリリースされたZFTurboの学習コードv1.0.23によるSubRoformerである。平均Multisongスコアは10.45で、SWを下回った。BS Roformer 124 bands 2026.07 などのスコアが最も高いモデルは MVSep の有料サービスを通じてのみ利用でき、その重みは公開されていない[^mvsep-algorithms]。

## 自前のダウンローダーは、クラウド上のyt-dlpより4〜15倍速い。

yt-dlpはPythonで書かれているので、サイトごとのエクストラクターをRustで書き、どちらもクラウドコンテナで計測した。各セルは5回の実行の中央値であり、プロセスの開始からファイルの書き込み完了までの時間を表している。

| サイト                     | yt-dlp onefile | yt-dlp onedir, `-N 8` | Rust   |
| -------------------------- | -------------- | --------------------- | ------ |
| YouTube, 3.4 MBのOpus      | 14.1 s         | 19.5 s                | 0.94 s |
| ニコニコ、HLS 54セグメント | 5.6 s          | 4.0 s                 | 3.4 s  |
| SoundCloud, AAC over HLS   | 4.1 s          | 3.7 s                 | 1.4 s  |

YouTubeにおける違いの大部分は、リクエスト数に起因している。yt-dlpは視聴ページとプレイヤーのJavaScriptを読み込み、Denoでその課題を解決している。データセンターのIPから、ウェブクライアントが403と429を受信し、再試行を繰り返す。Rust側は、visionOSクライアントとしてInnerTubeに1件のみリクエストを送信する。返ってくるのは暗号化されていない直接URLであり、これを1 MiBずつのRangeリクエストと並行して取得する。Rangeヘッダーのない単純なGETは、約32 KB/sに制限される。YouTubeとニコニコのファイルは、yt-dlpの出力結果と1バイト単位で一致した。

Rust側はよくあるケースしか扱えない。子供向け動画、年齢制限のある動画、会員限定動画、およびライブ配信は再生できない。クライアントは予告なしに動作しなくなることもある。だから、自前で取得に失敗すると、バージョンとSHA-256でピン留めされたyt-dlpの公式onedirビルドをダウンロードして、そちらを使う。どのパスが辿られ、なぜ自身のフェッチが失敗したかは、トレーススパンに記録される。

## symphoniaはOpusをデコードできない

YouTubeの音声はWebMではOpusとして配信されるが、symphonia 0.6にはOpusデコーダーがない。したがって、Opusパケットはopus-rsでデコードされ、OpusHeadヘッダーのバイト10〜11でプリスキップによって指定された先頭サンプルの数は破棄される。これらを破棄することなく、余分なサンプルがデコード済みオーディオの先頭に付加され、その位置が元のオーディオからずれる。

ステムは24ビットのFLACとして書き出される。最初に試したエンコーダーのflacencは、symphoniaが読み取れないファイルを生成した。それでflac-codecに乗り換えた。浮動小数点の値に `32767 * 256` を掛けたところ、書き込みと読み出しの後に 1.5e-5 のエラーが残った。2を23乗してクランプすると、エラーが消えた。

## ビートとキーモデルはrtenで動作する。

[Beat This! の Rust 移植版](https://github.com/danigb/beat-this-rs) は、Rust で書かれたランタイムである rten 上で ONNX モデルを実行し、システムライブラリを必要としない[^beat-this-rs]。拍と小節の開始時刻を返すため、yogotoは小節の開始時点から小節を構築する。合成した30秒の楽曲において、フルサイズモデルのCPU負荷は約3秒だった。

キー検出には、ONNXにエクスポートされたDeezerのS-KEYを使用している。グラフには特徴量抽出が含まれているため、22,050 Hzの生音声を渡すと24通りの確率が返ってくる。ファイルサイズは0.33 MBで、同一のRtenで動作する。エクスポートした人の説明によると、ボーカルのみを渡すと真のキーとその相対キーを同じくらいの頻度で返すので、伴奏ステムで使うものらしい[^skey-onnx]。yogotoはボーカル以外のステムを合計して、8小節ごとにキーを推定している。キー変更箇所が範囲として表示される箇所。

ヴァースやコーラスなどの構造を検出するには、SongFormerが候補となる。ONNX用のエクスポートがあるが、MuQとMusicFMという2つのエンコーダーが必要で、容量は約410MBだ。MuQの重みは、非商用利用に限定されたライセンスの下で提供されている[^songformer-onnx]。

## クラウドコンテナでは、メモリよりも先にディスクが枯渇する。

クラウドセッションの書き込み可能ディスク容量は約39 GB、メモリ容量は15 GBである。モノレポのRustチェックをすべて一度に実行したところ、ディスクに `target/debug` が格納され、プッシュは `No space left on device` で失敗した。ワークスペースごとにチェックを実行し、その間に `target/debug` を削除することで、プッシュを続行できる。タスクランナーがキャッシュされた結果を再実行するため、これで動作する。

[^bs-rofo-sw]: [enerjazzer/BS-ROFO-SW-Fixed](https://huggingface.co/enerjazzer/BS-ROFO-SW-Fixed)

[^mvsep-algorithms]: [MVSep algorithms](https://mvsep.com/en/algorithms)

[^beat-this-rs]: [beat-this-rs](https://github.com/danigb/beat-this-rs)

[^skey-onnx]: [musetric/skey-onnx](https://huggingface.co/musetric/skey-onnx)

[^songformer-onnx]: [akineAItech/CUE-Uttaro-SongFormer-ONNX](https://huggingface.co/akineAItech/CUE-Uttaro-SongFormer-ONNX)
