# @r_masseater/msch

このワークスペースは `msch` で、持ち主のチェックポリシーである。リポジトリ内の問題（例えば同一の値セットが 2 回書き込まれているなど）を検出し、共有の oxlint 設定を提供する。

msch を使っていないリポジトリでも、単体で役に立つパッケージがある。vite-plus-adopt、lint ルールのパッケージ（oxlint-typed-rules と oxlint-plugin-decision）、textlint ルールのプリセットである。これらは別々のパッケージとして npm に出し続ける。

msch はこれらのパッケージを依存に持ち、自分で適用する。msch を入れたリポジトリは、msch だけでこれらのルールと検査を使える。

msch を入れたリポジトリでは、ほかの場所からこれらのパッケージを直接使ってはならない。package.json に書かない、import しない、vite.config.ts で設定しない。msch はこれを検査し、直接の使用をすべて報告する。msch が適用するパッケージとは、msch の dependencies にある @r_masseater のパッケージである。
