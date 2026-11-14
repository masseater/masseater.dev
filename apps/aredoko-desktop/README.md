# aredoko

「あれどこだっけ」を見た目の言葉で探せる Unity エディタ拡張である。
プロジェクトや unitypackage に入っているモデル・テクスチャ・マテリアルを、「白いフリルのスカート」「古びた木の机」のような日本語で検索できる。
アセットと検索語は PC の外へ送らない。

動作環境は、VRChat Creator Companion が入れる Unity 2022.3.22f1 と、Windows 10・11 の 64 ビット版である。

## 導入

aredoko は、検索を受け持つ管理アプリと、Unity のエディタ拡張の 2 つでできている。

1. [Releases](https://github.com/masseater/masseater.dev/releases?q=aredoko) の `aredoko_x.y.z_x64-setup.exe` を実行する。管理アプリは起動するとタスクトレイに常駐する。
2. Unity の Window → Package Manager を開き、左上の「+」の「Add package from git URL...」に次の URL を入れる。

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

管理アプリの窓を閉じても、タスクトレイに残って検索を受け付ける。止めるときは、トレイのメニューから「終了」を選ぶ。

BOOTH の商品ページの URL を登録すると、商品名・ショップ名・タグでも検索できる。取得するのは誰でも見られる商品ページの公開情報だけで、ログイン情報や購入履歴には触れない。
