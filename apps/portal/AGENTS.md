# portal

このワークスペースは portal.masseater.dev で、持ち主だけが入れる個人用ポータルである。watashi、お金、スライド、認証情報を一か所で表示する。

- データは保持しない。データを保持する Worker の RPC エントリポイント（`@masseater.dev/portal-protocol`）と、personal.masseater.dev のサービスバインディングから読み取る。
- 持ち主の情報を表示するので、Access の外へ出す変更はしない。
