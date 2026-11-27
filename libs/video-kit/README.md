# @masseater.dev/video-kit

いつもの体裁の解説・紹介動画をRemotionで書くための部品である。縦（9:16）と横（16:9）の両方を同じ台本から出す。台本の型、カットと字幕の尺の計算、台本の検査、どの動画にも付く字幕、ナレーション、BGM、立ち絵と、見出しや項目などの部品を持つ。

masseater.devの中だけで使うworkspaceパッケージで、npmには出していない。動画そのものは[`apps/videos`](../../apps/videos/README.md)に置く。

## 動画の書き方

動画1本は`script.ts`と`video.tsx`の2ファイルで書く。

`script.ts`は台詞と尺を持つ。カット1つが字幕1枚とナレーション1文に当たる。

```ts
import type { VideoScript } from "@masseater.dev/video-kit/script";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 30 },
  voice: 8,
  readings: { pnpm: "ピーエヌピーエム" },
  cuts: [
    { id: "opening", say: ["npmの代わり、**pnpm**って知ってる？"], hold: 0.6 },
    { id: "rating", say: ["星**4つ**！"], hold: 0.8 },
  ],
};
```

`readings`は長い語から先に置き換え、読み上げる文からは空白を除く。コマンドは台詞では空白を入れて書き、読みはハイフンを除いたカナにする（`"npm install -g pnpm": "エヌピーエムインストールジーピーエヌピーエム"`）。

`video.tsx`はカットごとの絵を`draw`に書く。

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

- `say`の`**太字**`は字幕で色が変わる。`` `コード` ``は等幅で出る。
- `hold`は台詞の後に絵だけを見せる秒数である。
- `at`はカットの頭から数えたフレームで、部品はそこで出る。
- 字幕、ナレーション、BGM、立ち絵、カットごとの軽い寄りはvideo-kitが付ける。`video.tsx`に書くのは画面の中身だけである。
- カットに`voice`を書くと、そのカットだけ話者やスタイルが変わる。掛け合いや表情の切り替えに使う。クレジットには使った話者が全員載る。
- `images`に名前とURL（またはキャッシュのパス）を並べると、`imageOf("名前")(shot)`で絵の中から引ける。

## 見た目を差し替える

`video.tsx`が`look`を書き出すと、動画全体の見た目がそれに替わる。書かなかった層は既定のまま残る。

| 層         | 型                   | 既定                       | 例                                 |
| ---------- | -------------------- | -------------------------- | ---------------------------------- |
| `backdrop` | `(timeline) => 絵`   | 紙色の背景                 | 写真の背景、立ち絵、端末のログ     |
| `frame`    | `(shot, 中身) => 絵` | いつもの字幕と吹き出しの枠 | 字幕の位置と色、話者ごとの色、ロゴ |
| `overlay`  | `(timeline) => 絵`   | 右下の立ち絵               | 常に出る題名の帯、シリーズの宣伝枠 |

```tsx
export const look: Partial<Look> = {
  backdrop: (timeline) => (
    <>
      <Backdrop src={imageOf("classroom")(timeline)} tone="dim" />
      <Character
        className="bottom-[-60px] left-[-60px] h-[1020px] w-[600px]"
        timeline={timeline}
        voices={[3, 1, 7]}
      />
    </>
  ),
  overlay: () => <TitleBar text={"最新ツール解説\n「pnpm」"} />,
  frame: (shot, content) => (
    <>
      {content}
      <Caption className="caption-box text-[80px]" shot={shot} />
    </>
  ),
};
```

`src/pages/pnpm-*/`の10本は、解説系の人気チャンネル10個の型をそれぞれ`look`で写したものである。新しい動画はこの中から近い型を写して始める。

## 部品

| 部品        | 用途                                                                                    |
| ----------- | --------------------------------------------------------------------------------------- |
| `Headline`  | ツール名、見出し、締めの一文                                                            |
| `Tags`      | ツール名の下に並ぶ札                                                                    |
| `Points`    | 見出しの下の項目。最新の項目を目立たせる                                                |
| `Rating`    | 星のおすすめ度                                                                          |
| `Terminal`  | コマンドと出力                                                                          |
| `Label`     | 締めの前の小見出し                                                                      |
| `Credits`   | BGMと効果音のクレジット                                                                 |
| `Sfx`       | 画面の出来事に合わせた効果音                                                            |
| `Backdrop`  | 全面の写真やイラストの背景。ぼかし、暗くする                                            |
| `Character` | 話者の立ち絵。話すたびに跳ね、カットごとにポーズを替える                                |
| `Caption`   | 今の台詞の字幕。`caption-outline`、`caption-box`、`caption-plain`で縁取り、箱、影を選ぶ |
| `TitleBar`  | 上に出しっぱなしの題名の帯                                                              |
| `Picture`   | ポップして出る絵や画面写真                                                              |
| `Footage`   | 全面の画面写真をゆっくり寄せて流す、実写の代わりの映像                                  |
| `Shout`     | 叩きつけるように出る大きな一言                                                          |

文字はNoto Sans JP（Black、Bold、実写系の字幕向けのMediumとLight）、コードはIBM Plex Monoだけを使う。画面を揺らす演出は持たない。

効果音は効果音ラボの素材を`src/shared/config/sfx.ts`に並べている。再配布が禁じられているので、ファイルはリポジトリに入れず、`apps/videos`が手元のキャッシュに落とす。
