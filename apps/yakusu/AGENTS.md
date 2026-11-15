# yakusu

このワークスペースは yakusu で、ユーザー自身の PC 上で PLaMo 3 Translate を使ってテキストを翻訳するデスクトップアプリである。

- モデルやllama-serverをリポジトリやインストーラーに配置しないこと。
- `cargo test -p yakusu --test engine -- --ignored` を指定して、実モデルで翻訳を確認すること。
- PLaMo Community License に従い、アプリで「Built with PLaMo」と表示し、インストーラーへライセンスのコピーを入れること。配布する派生モデルの名前は「PLaMo」で始める。
