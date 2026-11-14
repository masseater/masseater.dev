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

- `song.tracks` は REAPER での並び順で、同じ名前のトラックも全部残る。各トラックは並びの番号の `index` と `guid` を持つ。
- アイテムの `source` は `midi`・`audio`・`video`（動画と画像）・`other` のどれかで、`SECTION` で包まれたソースは中のソースを読む。アイテムは選ばれたテイクを読み、トリム・再生速度・ループ・開始のずれに合わせてノートを並べる。
- ノートの `start` と `duration` は秒で、テンポの線（`song.tempoMap`）の段差となめらかな変化を通して拍から直してある。`song.tempo` はテンポの線の最初の点である。
- `song.markers` はリージョンでない通常のマーカー、`song.regions` はリージョンの名前・開始・終了である。`song.sections` はリージョンがあればリージョン、無ければマーカーから次のマーカーまでの区間で、名前の無いものは入らない。
- `trackNamed`・`tracksNamed`・`markerNamed`・`markersNamed` で名前から引く。見つからなければ `undefined` を返す。
- トラックの `fx` は FX チェーンの並び順で、各 FX は `guid`・`bypass`・`offline` を持つ。JSFX はスライダーの番号と値を `params` に持ち、ファイルを選ぶスライダーの値はファイル名である。

`rpp-kit/vite` のプラグインを入れると `.rpp` を import できる。TypeScript 7.1 ベータの content mapper（`tsc --runExternalCode`）を有効にすると、トラック名・マーカー名・テンポがリテラル型になる。無い名前や、`.rpp` が参照する音声ファイルの欠けは型エラーになる。oxlint の型検査はまだ content mapper を読めない（[tsgolint#1166](https://github.com/oxc-project/tsgolint/pull/1166)）ので、プラグインが同じ型を `.rpp` の隣に `.d.rpp.ts` として書き出す。
