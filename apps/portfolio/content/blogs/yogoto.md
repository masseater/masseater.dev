---
title: "yogoto, Pythonを使わない楽曲管理ツール（2026年11月18日時点）" description: "yogotoは、楽曲をインポートし、ステムに分離してビートやキーを検出するためにRustで開発しているデスクトップアプリだ。このメモには、Pythonの部分（モデル推論、オーディオのダウンロードとデコード）を置き換えた際に分かったことを記録している。" tags: ["Rust", "音楽", "yogoto"] published: true
---

yogotoは、楽曲管理用に開発しているデスクトップアプリだ。PCにYouTube、ニコニコ、SoundCloudのリンクや音声ファイルを放り込むと、元の音声を再エンコードせずに保持し、BS-RoFormerモデルでステムに分離し、ビート、小節、キーを検出する。AIがインポートや分離をリクエストし、アプリが動作しているMCPサーバー `127.0.0.1` 経由でその結果を読み取ることができる。コードはmasseater.devの [apps/yogoto](https://github.com/masseater/masseater.dev/tree/main/apps/yogoto) にある。

アプリ全体はRustで書かれており、Pythonは使っていない。モデル推論、音声ダウンロード、音声デコードはPythonエコシステムで一般的に扱われる部分だったため、このメモにはそれらをそれぞれ置き換えた際に分かったことを記録しておく。

| Stage          | What runs                                                  | Python equivalent avoided |
| -------------- | ---------------------------------------------------------- | ------------------------- |
| Download       | Own Rust extractors, falling back to a pinned yt-dlp build | yt-dlp                    |
| Separation     | BS-RoFormer implemented with candle                        | PyTorch, ONNX conversion  |
| Beats and bars | Rust port of Beat This! on the rten runtime                | beat_this                 |
| Key            | S-KEY exported to ONNX, on rten                            | skey                      |
| Decoding       | symphonia, plus opus-rs for Opus                           | ffmpeg                    |

## BS-RoFormerは、コミュニティのチェックポイントを直接読み取ることで、キャンドル単位で動作する。

BS-RoFormerファミリーのセパレーションモデルは、YAML設定付きのPyTorchチェックポイントとして公開されている。これらをONNXに変換するにはPythonが必要なため、ネットワークはキャンドル0.11で実装し、`.ckpt`および`.yaml`ファイルをそのまま読み込むようにした。重みはHugging Faceの固定リビジョンから取得している。デフォルトモデルはBS-RoFormer SWで、ベース、ドラム、その他、ボーカル、ギター、ピアノの6つのステムを出力する[^bs-rofo-sw]。

テストでは、同一の重みと固定リビジョンのPyTorch出力をダウンロードし、両者を比較する。当初は出力が一致しなかったが、その原因はスペクトログラムのDCビンをゼロにするオプションである `zero_dc` にあった。CPUで分離テストを実行したところ243秒かかった。関数にロード済みのセパレータを渡し、テストでより短いチャンクを使用したところ、約21秒となった。

また、より新しいモデルが利用可能かどうかも確認した。公開ウェイトを持つ最新モデルは、2026-11-08にリリースされたZFTurboの学習コードv1.0.23におけるSubRoformerであり、その平均Multisongスコア10.45はSWを下回っていた。BS Roformer 124 bands 2026.07のように最高スコアを持つモデルは、MVSepでは有料サービスとしてのみ提供されており、そのウェイトは公開されていない[^mvsep-algorithms]。

## 自前のダウンローダーは、クラウド上のyt-dlpよりも4〜15倍高速だ。

yt-dlpはPythonで書かれているため、各サイト用のエクストラクターをRustで作成し、どちらもクラウドコンテナで計測した。各セルは、プロセス開始から書き込みファイルまでの5回の実行の中央値である。

| Site                      | yt-dlp onefile | yt-dlp onedir, `-N 8` | Rust   |
| ------------------------- | -------------- | --------------------- | ------ |
| YouTube, 3.4 MB Opus      | 14.1 s         | 19.5 s                | 0.94 s |
| Niconico, 54 HLS segments | 5.6 s          | 4.0 s                 | 3.4 s  |
| SoundCloud, AAC HLS       | 4.1 s          | 3.7 s                 | 1.4 s  |

YouTubeにおける差異の大部分はリクエストに起因する。yt-dlpはウォッチページとプレイヤーのJavaScriptを読み込み、Denoを用いて課題を解決するが、データセンターのIPからウェブクライアントが403および429レスポンスを受け取り、リトライを行う。Rustのパスでは、visionOSクライアントとして1つのInnerTubeリクエストを送信し、暗号なしの直接URLを返し、1 MiB範囲のリクエストを並列にダウンロードする。Rangeヘッダーのない単純なGETリクエストは、約32 KB/sまでスロットリングされる。YouTubeおよびNiconicoのファイルは、yt-dlpの出力とバイト単位で同一である。

Rustのパスは一般的なケースのみに対応している。子供向け動画、年齢制限のある動画、会員限定動画、ライブ配信などは再生できず、単一のクライアントが予告なく切断される可能性がある。そのため、失敗した場合はyogotoがバージョンとSHA-256でピン留めされた公式のyt-dlp onedirビルドをダウンロードし、代わりにそれを使用する。使用されたルートと独自のパスが失敗した理由は、トレーススパンに記録されている。

## シンフォニアはOpusをデコードしない

YouTubeの音声はWebMではOpusとして配信されるが、symphonia 0.6にはOpusデコーダーが搭載されていない。Opusパケットをopus-rsでデコードし、OpusHeadヘッダーのバイト10および11にあるpre-skipフィールドで指定されたサンプル数を切り捨てている。これを行わないと、デコードされた音声は余分なサンプルから始まり、元の音声と整合しなくなる。

ステムは24ビットのFLAC形式で記述されている。最初に試したエンコーダのflacencではsymphoniaでデコードできないファイルが生成されたため、flac-codecに切り替えた。floatを`32767 * 256`でスケーリングしたところ、ラウンドトリップ後に1.5e-5のエラーが出た。クランプを解除して2^23でスケーリングしたところ、エラーは解消した。

## BeatおよびKeyモデルはPythonなしでRTENで動作する。

[Beat This!のRust移植版](https://github.com/danigb/beat-this-rs)は、Rustで書かれたランタイムであるrten上でONNXモデルを実行し、システムライブラリを必要としない[^beat-this-rs]。ビートとダウンビートの時刻を返し、yogotoはダウンビートからバーを構築する。合成30秒のトラックでは、モデル全体のCPU実行時間は約3秒だった。

キー検出において、DeezerのS-KEYをONNXでエクスポートすると、グラフに特徴抽出が含まれるため、22,050 Hzの生オーディオを受け取り、24個の確率を返す。ファイルサイズは0.33 MBで、同一のRtenで動作する。エクスポートでは、単独のボーカルはキー[^skey-onnx]と同程度の頻度で相対短調が得られるため、これが楽器のステム向けであることが記されている。yogotoはボーカルを除くすべてのステムを合計し、8小節ごとにキーを推定するため、キーの変化はレンジとして表示される。

ヴァースやコーラスなどのセクションには、SongFormerが適している。ONNXエクスポートが存在するが、それぞれ約410MBのエンコーダー（MuQとMusicFM）が必要であり、MuQの重みは非商用利用に限りライセンスされている[^songformer-onnx]。

## クラウドコンテナがメモリよりも先にディスクから不足する。

クラウドセッションの書き込み可能ディスク容量は約39 GB、メモリ容量は15 GBである。モノレポのRustチェックを一度にすべて実行したところ、`target/debug` が埋められ、プッシュは `No space left on device` で失敗した。ワークスペースごとのチェックを一つずつ実行し、その間に `target/debug` を削除することで、タスクランナーがキャッシュ済みの結果をリプレイするため、プッシュを続行できる。

[^bs-rofo-sw]: [enerjazzer/BS-ROFO-SW-Fixed](https://huggingface.co/enerjazzer/BS-ROFO-SW-Fixed)

[^mvsep-algorithms]: [MVSepアルゴリズム](https://mvsep.com/en/algorithms)

[^beat-this-rs]: [beat-this-rs](https://github.com/danigb/beat-this-rs)

[^skey-onnx]: [musetric/skey-onnx](https://huggingface.co/musetric/skey-onnx)

[^songformer-onnx]: [akineAItech/CUE-Uttaro-SongFormer-ONNX](https://huggingface.co/akineAItech/CUE-Uttaro-SongFormer-ONNX)
