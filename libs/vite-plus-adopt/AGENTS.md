# @r_masseater/vite-plus-adopt

このワークスペースは `vpa` である。Betterleaks、actionlint、zizmor といった外部チェックを Vite+ に取り込み、すべてのチェックを単一のコマンドで実行する。

サブコマンドを追加しないこと。引数なしで1回実行すると、設定済みのチェックがすべて行われる。betterleaks、actionlint、zizmor は postinstall でインストールし、実行時にダウンロードしないこと。
