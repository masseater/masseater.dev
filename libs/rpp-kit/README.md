# rpp-kit

REAPER のプロジェクトファイル（`.rpp`）を、MIDI へ書き出さずに TypeScript から直接読むためのキットである。
`import { song } from "./song.rpp"` と書くと、テンポ・マーカー・トラック・MIDI のノートがそのまま値として手に入る。

- `libs/rpp-kit` は `.rpp` のパーサーと、それを使う Vite プラグイン（`rpp-kit/vite`）と、
  TypeScript 7.1 の content mapper を持つ。
- `apps/rpp-kit-demo` はデモのページで、https://masseater.dev/rpp-kit/ に置いている。GPLv3 で公開されているゲーム
  [Timmy Time Adventure](https://github.com/warrior-rockk/timmy-time-adventure)
  の `intro.rpp` を読み込み、セクションとノートを並べて鳴らす。
  この `.rpp` は GPLv3 のまま再配布している。

## rpp-kit で読めるもの

### 曲を読み、ノートの時刻を取る

`readSong` に `.rpp` の文字列を渡すと、曲が手に入る。

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

- `song.tracks` は REAPER での並び順の配列で、同じ名前のトラックも全部残る。
  各トラックは並びの番号の `index` と、`guid` を持つ。
- アイテムの `source` は、`midi`（ノート）・`audio`・`video`（動画と画像）・`other` のどれかである。
  `SECTION` で包まれたソースは、中のソースを読む。
- アイテムは選ばれたテイクを読み、トリム・再生速度・ループ・開始のずれに合わせてノートを並べる。
- ノートの `start` と `duration` は秒である。
  テンポの線（`song.tempoMap`）の段差となめらかな変化を通して、拍から秒に直してある。
  `song.tempo` はテンポの線の最初の点に合わせてある。

### 曲の構成

- `song.markers` は、リージョンでない通常のマーカーを時刻の順に並べた配列である。
- `song.regions` は、リージョンの名前・開始・終了の配列である。
- `song.sections` は、リージョンがあればリージョンそのもの、無ければ通常のマーカーから次のマーカーまでの区間である。
  名前の無いものは入らない。

### 名前で引く

`trackNamed(song, "Bass")` は最初の 1 本を返し、`tracksNamed(song, "Bass")` は同じ名前を全部返す。
マーカーも `markerNamed`・`markersNamed` で引ける。
見つからなければ `undefined` を返す。

### FX

トラックの `fx` は FX チェーンの並び順で、各 FX は `guid`・`bypass`・`offline` を持つ。
JSFX はスライダーの番号と値を `params` に持つ（例: `{ slider: 22, value: -3602 }`）。
ファイルを選ぶスライダーの値はファイル名の文字列である。

### `.rpp` を import する

`rpp-kit/vite` のプラグインを入れると、`import { song } from "./song.rpp"` と書いて曲を値として読める。
content mapper を有効にすると、トラック名・マーカー名・テンポがリテラル型になる。
`trackNamed(song, "…")` や `markerNamed(song, "…")` の名前がエディターの候補に出て、
`markerNamed(song, "Gm8")` のような無い名前は型エラーになる。
`.rpp` が参照する音声ファイルが無ければ、そのファイル名の行がエラーになる。

content mapper は TypeScript 7.1 のベータ版の機能で、`tsc --runExternalCode` で使う。
oxlint の型検査はまだ content mapper を読めない（[tsgolint#1166](https://github.com/oxc-project/tsgolint/pull/1166)）。
そのため `rpp-kit/vite` のプラグインが、`.rpp` の隣に content mapper と同じ型を `.d.rpp.ts` として書き出す。
手で `declare` を書く必要はない。
