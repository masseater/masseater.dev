# @masseater.dev/song-format

このワークスペースは、楽曲ファイル形式 `.fumx` を定義する。`.fumx` は型付きの汎用言語で、将来の DAW の保存形式にもなる。TypeScript からは `import { song } from "./song.fumx"` で、コンパイル済みの楽曲を値として読める。

文法は `src/features/read-song/model/fumx.langium` にある。変更したら `vp run grammar` を実行して `generated/langium` のパーサーを生成し直す。

`song-report <file>` は、楽曲ファイルから導いたキー、コード、繰り返しの小節を JSON 形式で出力する。楽曲を聴けない AI は、この出力を読んで自分が書いたものを確かめる。
