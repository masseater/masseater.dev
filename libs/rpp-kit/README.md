# rpp-kit

REAPER のプロジェクトファイル（`.rpp`）を、MIDI へ書き出さずに TypeScript から直接読むためのキットである。`import { song } from "./song.rpp"` と書くと、テンポ・マーカー・トラック・MIDI のノートが値として手に入る。[デモ](https://masseater.dev/rpp-kit/)は GPLv3 で公開されているゲーム [Timmy Time Adventure](https://github.com/warrior-rockk/timmy-time-adventure) の `intro.rpp` を読み、セクションとノートを並べて鳴らす。この `.rpp` は GPLv3 のまま再配布している。

```ts
import { readSong } from "rpp-kit";

const song = readSong(text);
for (const track of song.tracks) {
  for (const item of track.items) {
    if (item.source.kind === "midi") {
      console.log(track.name, item.source.notes);
    }
  }
}
```

`rpp-kit/vite` のプラグインを入れると `.rpp` を import できる。TypeScript 7.1 ベータの content mapper（`tsc --runExternalCode`）を有効にすると、トラック名・マーカー名・テンポがリテラル型になる。無い名前や、`.rpp` が参照する音声ファイルの欠けは型エラーになる。oxlint の型検査はまだ content mapper を読めない（[tsgolint#1166](https://github.com/oxc-project/tsgolint/pull/1166)）ので、プラグインが同じ型を `.rpp` の隣に `.d.rpp.ts` として書き出す。
