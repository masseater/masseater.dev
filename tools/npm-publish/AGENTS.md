# npm-publish

このワークスペースは、`libs/` のパッケージを npm に出す。

npm にまだ無い名前は publish.yml の OIDC では出せない。task ワークフローで `claim-npm-names` を credentials `github` で動かすと、本人の承認 1 回のログインで仮の版を出し、Trusted Publisher を登録する。承認リンクは Issue に書き込まれる。
