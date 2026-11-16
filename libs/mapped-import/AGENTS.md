# mapped-import

このワークスペースには、TypeScript が持ち主自身のフォーマットで記述したファイルをインポートするための共有パーツが格納されている。各フォーマットは、ファイルを 1 つのセグメントリストに変換する。このワークスペースは、そのリストから TypeScript 7.1 の content mapper が返す型と Vite が返すモジュールを作る。content mapper をまだ読み取れない oxlint のために、同じ型を `.d.<extension>.ts` ファイルとしてソースの隣に書き込む。
