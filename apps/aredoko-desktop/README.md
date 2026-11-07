# aredoko

「あれどこだっけ」を見た目の言葉で探せる Unity エディタ拡張。

Unity の中で、プロジェクトや unitypackage に入っているモデル・テクスチャ・マテリアルを「白いフリルのスカート」「古びた木の机」のような日本語で検索できる。
名前を覚えていないアセットも、見た目の特徴から見つけられる。

## 特徴

| 特徴             | 内容                                       |
| ---------------- | ------------------------------------------ |
| Unity の中で検索 | 検索結果からシーンへの配置とインポート     |
| 中身の単位で検索 | パッケージ内のモデル・テクスチャ単位の結果 |
| 手元だけで動作   | アセットや検索語の外部送信なし             |

## 動作環境

| 項目  | 内容                                  |
| ----- | ------------------------------------- |
| Unity | 2022.3.22f1                           |
| OS    | Windows 10・Windows 11 の 64 ビット版 |

Unity は VRChat Creator Companion が入れる 2022.3.22f1 を使う。

## 導入

aredoko は、検索を受け持つ管理アプリと、Unity のエディタ拡張の 2 つでできている。

1. [Releases][releases] の aredoko の `aredoko_x.y.z_x64-setup.exe` を実行する。
   入った管理アプリは、起動するとタスクトレイに常駐する。
2. Unity の Window → Package Manager を開く。
   左上の「+」の「Add package from git URL...」に次の URL を入れる。

```text
https://github.com/masseater/masseater.dev.git?path=apps/aredoko-unity/Packages/dev.masseater.aredoko
```

## 使い方

| 手順           | 操作                                                      |
| -------------- | --------------------------------------------------------- |
| フォルダの登録 | 管理アプリの「探す場所」に unitypackage のフォルダを追加  |
| 索引の作成     | 登録すると始まり、サイドバーに進み具合が出る              |
| Unity で検索   | Window → aredoko → アセット検索（Ctrl+Shift+K）           |
| 取り込み       | unitypackage の中身はインポート、ほかはシーンへドラッグ   |
| BOOTH の情報   | 「ライブラリ」でパッケージを選び、商品ページの URL を登録 |

管理アプリの窓を閉じても、タスクトレイに残って検索を受け付ける。
止めるときは、トレイのメニューから「終了」を選ぶ。

## BOOTH・VRChat のアセット

BOOTH の商品ページの URL を登録すると、商品名・ショップ名・タグでも検索できる。
取得するのは誰でも見られる商品ページの公開情報だけで、ログイン情報や購入履歴には触れない。
衣装・髪型・ワールド用の小物は、VRChat のアバター改変やワールド制作での探し方に合わせて検索の精度を調整している。

## 公開先

| 対象                 | 入手先               |
| -------------------- | -------------------- |
| 管理アプリ           | [Releases][releases] |
| Unity のエディタ拡張 | 「導入」の git URL   |

[releases]: https://github.com/masseater/masseater.dev/releases?q=aredoko

## ライセンス

[AGPL-3.0](../../LICENSE)
