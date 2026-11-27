# @masseater.dev/video-kit

いつもの体裁の解説・紹介動画を Remotion で書くための部品である。縦（9:16）と横（16:9）の両方を同じ台本から出す。台本の型、カットと字幕の尺の計算、台本の検査、どの動画にも付く字幕、ナレーション、BGM、立ち絵と、見出しや項目などの部品を持つ。

masseater.dev の中だけで使う workspace パッケージで、npm には出していない。動画そのものは [`apps/videos`](../../apps/videos/README.md) に置く。

## 動画の書き方

動画 1 本は `script.ts` と `video.tsx` の 2 ファイルで書く。

`script.ts` は台詞と尺を持つ。カット 1 つが字幕 1 枚とナレーション 1 文に当たる。

```ts
import type { VideoScript } from "@masseater.dev/video-kit/script";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 30 },
  voice: 8,
  readings: { pnpm: "ピーエヌピーエム" },
  cuts: [
    { id: "opening", say: ["npm の代わり、**pnpm** って知ってる？"], hold: 0.6 },
    { id: "rating", say: ["星**4つ**！"], hold: 0.8 },
  ],
};
```

`video.tsx` はカットごとの絵を `draw` に書く。

```tsx
import type { Draw } from "@masseater.dev/video-kit";
import { Headline, Rating, Sfx } from "@masseater.dev/video-kit";

export const draw: Readonly<Record<string, Draw>> = {
  opening: (shot) => <Headline shot={shot} slot="name" text="**pnpm**" />,
  rating: (shot) => (
    <>
      <Headline shot={shot} text="おすすめ度" />
      <Sfx at={0} kind="stamp" shot={shot} />
      <Rating at={[6, 10, 14, 18, 22, 30]} score={4} />
    </>
  ),
};
```

- `say` の `**太字**` は字幕で色が変わる。`` `コード` `` は等幅で出る。
- `hold` は台詞の後に絵だけを見せる秒数である。
- `at` はカットの頭から数えたフレームで、部品はそこで出る。
- 字幕、ナレーション、BGM、立ち絵、カットごとの軽い寄りは video-kit が付ける。`video.tsx` に書くのは画面の中身だけである。

## 部品

| 部品       | 用途                                     |
| ---------- | ---------------------------------------- |
| `Headline` | ツール名、見出し、締めの一文             |
| `Tags`     | ツール名の下に並ぶ札                     |
| `Points`   | 見出しの下の項目。最新の項目を目立たせる |
| `Rating`   | 星のおすすめ度                           |
| `Terminal` | コマンドと出力                           |
| `Label`    | 締めの前の小見出し                       |
| `Credits`  | BGM と効果音のクレジット                 |
| `Sfx`      | 画面の出来事に合わせた効果音             |

文字は Noto Sans JP の Black と Bold、コードは IBM Plex Mono だけを使う。画面を揺らす演出は持たない。

効果音は効果音ラボの素材を `src/shared/config/sfx.ts` に並べている。再配布が禁じられているので、ファイルはリポジトリに入れず、`apps/videos` が手元のキャッシュに落とす。
