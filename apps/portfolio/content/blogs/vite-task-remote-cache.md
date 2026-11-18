---
title: "CloudflareのVite Taskリモートキャッシュ"
description: "vp 1.7.0には、ドキュメントに記載のないVite Task用のリモートキャッシュクライアントが搭載されている。masseater.dev は D1 と R2 にある独自の Worker からこれを提供しており、Workers Paid に含まれる利用範囲に収まるよう上限が設けられている。"
tags: ["Vite+", "Vite Task", "Cloudflare"]
published: true
---

[Vite Task](https://github.com/voidzero-dev/vite-task)は、Vite+の`vp run`を支えるタスクランナーである。タスクが読み込んだファイルや環境変数を記録し、変更されていない場合に出力を再生する[^vite-run]。ドキュメントにはローカルキャッシュのみが記載されている。新しい CI ランナーや新しいクラウドセッションは、空のキャッシュで始まり、すべてのタスクを最初から実行する。

## vpにおけるクライアント

vp 1.7.0 のクレート `vt_remote_cache` にはすでにリモートキャッシュクライアントが含まれているが、ドキュメントのどのページにも言及はない。vpを偽サーバーに向け、その送信内容を記録した。2つの環境変数で有効になる。

| 変数                  | 値                                                                              |
| --------------------- | ------------------------------------------------------------------------------- |
| `VP_REMOTE_CACHE`     | `off`、`read`、または `read-write`。URLのみが設定されている場合、vpは読み込む。 |
| `VP_REMOTE_CACHE_URL` | `https://<host>/projects/<namespace>`                                           |

vpはそのURL配下の3つのエンドポイントを呼び出す。

| リクエスト       | 本文                                      | 使用                             |
| ---------------- | ----------------------------------------- | -------------------------------- |
| `POST /fetch`    | キーを含むCBOR                            | キャッシュエントリを検索する     |
| `GET /blob/{id}` | なし                                      | 出力アーカイブをダウンロードする |
| `POST /store`    | `metadata` および `blob` を含む multipart | エントリをアップロードする       |

vpは、CIにおいても`fetch`や`blob`に`Authorization`ヘッダーを送信しない。GitHub ActionsのOIDCトークンを保持するのは`store`のみであり、その対象はエンドポイントURL自体である。JWT ではないトークンは「failed to authenticate」と失敗する。エントリが一致すると、vpは `remote cache hit, replaying` と出力する。

VoidZero独自のサーバーである[vite-plus-remote-cache-cloudflare](https://github.com/voidzero-dev/vite-plus-remote-cache-cloudflare)では、同一の3つのエンドポイントと同一のルールが定義されている。誰でも有効化された名前空間を読み取ることができ、登録済みリポジトリのメインブランチへのプッシュのみが書き込み可能である[^vp-remote-cache-cloudflare]。11月18日現在、READMEには依然として「このプロジェクトは作成中であり、まだ利用可能な状態ではない」と記載されている。

読み取りにはトークンが伴わないため、サーバーは誰が読み取っているかを判別できない。プライベートリポジトリのキャッシュは、URLを知っている人なら誰でも読み取れる。masseater.dev は公開されているため、この点は問題にならないが、非公開の mirucord や personal-space はこのプロトコルを利用できない。

## Worker

masseater.dev は、`task-cache.masseater.dev` にある独自の Worker からプロトコルを提供する。エントリのインデックスはD1にある。最大256 KiBの値もD1に格納され、より大容量の出力アーカイブはR2に送られる。

Workerは、僕が所有するリポジトリのメインブランチで実行したGitHub ActionsのOIDCトークンがある場合にのみ、`store`を受け付ける。名前空間はリポジトリ名である。各ストアではリポジトリが公開されているかどうかも記録されており、`fetch` は公開名前空間に対してのみ応答する。

R2とD1には使用量制限がないため、Workerは自身の使用量をカウントする。D1にはアップロードごとおよびR2の読み取りごとに1行ずつ保持し、30分ごとのcronジョブで古い行や期限切れのエントリを削除する。上限は Worker のソースの1つのファイルに書かれている。

| 上限                     | 値                             | Workers Paid に毎月含まれる量    |
| ------------------------ | ------------------------------ | -------------------------------- |
| 保存データ               | 3 GiB                          | R2 10 GB-月, D1 5 GB             |
| アップロード (R2クラスA) | 1日5,000件、1ヶ月で約150,000件 | 1,000,000                        |
| R2 読み取り（クラス B）  | 1日10万件、1ヶ月で約300万件    | 10,000,000                       |
| 保持                     | 7日間                          | なし                             |
| キーあたりのエントリ数   | 8                              | なし                             |
| リクエスト               | 1分あたり1,200                 | 10,000,000件のワーカーリクエスト |
| リクエストあたりのCPU    | 1,000 ms                       | 30,000,000 CPU ms                |

含まれる量は、R2、D1、およびWorkers[^r2-pricing][^d1-pricing][^workers-pricing]の料金ページに記載されているものである。すべての上限に達した場合でも、ストレージとR2操作は含まれる使用量に収まる。Cloudflareのアカウントは他のアプリと共有されているため、上限を上げる前にアカウント全体の利用状況を比較する。

## 数値

Workerは11月17日 20:13 UTCに本番稼働した。約6時間後、239キーに対して633件のエントリが保持されており、R2に219 MBのアーカイブ、D1に43 MBのデータベースが存在していた。746回のアップロードが行われ、1,653回のR2読み取りが実行された。

CIではメインブランチがリモートキャッシュに書き込むが、同じジョブのGitHub Actionsキャッシュが依然としてほとんどのタスクを処理している。実行 1224 の `verify` ジョブでは、129 個のタスクのうち 127 個がキャッシュにヒットし、そのうちリモートキャッシュからのヒットはわずか 3 個であった。

クラウドセッションにはGitHub Actionsのキャッシュがないため、リモートキャッシュが唯一のソースとなる。11月18日、ローカルキャッシュを空にし、`VP_REMOTE_CACHE_URL`を設定した状態で、新しいクラウドセッションで `vp run verify` を実行した。セッションは4コアで、一度に2つのタスクを実行した。

| 結果                                 | タスク |
| ------------------------------------ | ------ |
| リモートキャッシュヒット             | 55     |
| リモートキャッシュにエントリがない   | 68     |
| 保存済みエントリ以降に変更された入力 | 15     |
| キャッシュ無効                       | 2      |

vpは1,949秒の短縮を報告し、検証全体には34分21秒かかった。ヒットしたのは主に、`vp test` や `vp pack` といった TypeScript パッケージのテストやビルドだった。エントリのない68件のタスクのうち、58件がcargo タスクであった。vpは、実際にタスクを実行している時にのみエントリを保存する。CIでは、ほとんどのタスクがGitHub Actionsのキャッシュによって処理されるため、Workerの公開後に変更されていないタスクにはまだリモートエントリが存在しない。

[^vite-run]: Vite+ - Run. https://viteplus.dev/guide/run

[^vp-remote-cache-cloudflare]: voidzero-dev/vite-plus-remote-cache-cloudflare. https://github.com/voidzero-dev/vite-plus-remote-cache-cloudflare

[^r2-pricing]: Cloudflare R2 pricing. https://developers.cloudflare.com/r2/pricing/

[^d1-pricing]: Cloudflare D1 pricing. https://developers.cloudflare.com/d1/platform/pricing/

[^workers-pricing]: Cloudflare Workers pricing. https://developers.cloudflare.com/workers/platform/pricing/
