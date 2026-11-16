# mapped-import

このワークスペースには、TypeScript が持ち主自身のフォーマットで記述したファイルをインポートするための共有パーツが格納されている。各フォーマットは、ファイルを 1 つのセグメントリストに変換する。そのリストから、このワークスペースは、TypeScript 7.1 の content mapper が返す型、Vite が返すモジュール、そして content mapper をまだ読み取れない oxlint のためにソースの隣に書き込む `.d.<extension>.ts` ファイルを構築する。
