# @masseater.dev/song-format

このワークスペースは、楽曲ファイル形式 `.fumx` を定義する。`.fumx` は型付きの汎用言語で、将来の DAW の保存形式にもなる。TypeScript からは `import { song } from "./song.fumx"` で、コンパイル済みの楽曲を値として読める。

`.fumx` の文法と、曲の値まで読む部分は公開ライブラリの `@r_masseater/fumx-parser`（libs/fumx-parser）にある。このワークスペースは、その上に TypeScript からの import、言語サーバー、解析、MIDI 変換を載せる。

`song-report <file>` は、楽曲ファイルから導いたキー、コード、繰り返しの小節を JSON 形式で出力する。楽曲を聴けない AI は、この出力を読んで自分が書いたものを確かめる。

`midi-to-fumx <file>` は、Standard MIDI File を `.fumx` に変換する。書いた `.fumx` を読み直して元の MIDI のイベントと突き合わせ、1つでも合わなければ失敗する。
