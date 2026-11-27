/** @internal */
export const SCRIPT_TEMPLATE = `import type { VideoScript } from "@masseater.dev/video-kit/script";

export const script: VideoScript = {
  title: "ツール名",
  formats: ["vertical"],
  length: { vertical: 30 },
  voice: 8,
  readings: {},
  cuts: [
    { id: "opening", say: ["**ツール名**、知ってる？"] },
    { id: "features", say: ["一言で言うと**こう**。"] },
    { id: "insight", say: ["使ってわかったのは**これ**。"] },
    { id: "complaint", say: ["不満は**ひとつ**。"] },
    { id: "rating", say: ["おすすめ度は**星4つ**。"] },
    { id: "ending", say: [], hold: 2 },
  ],
};
`;

/** @internal */
export const VIDEO_TEMPLATE = `import type { Draw } from "@masseater.dev/video-kit";
import { Credits, Headline, Label, Points, Rating, Tags } from "@masseater.dev/video-kit";

export const draw: Readonly<Record<string, Draw>> = {
  opening: (shot) => (
    <>
      <Headline shot={shot} slot="name" text="**ツール名**" />
      <Tags at={[8, 16]} items={["20XX年〜", "出した会社・人"]} />
    </>
  ),
  features: (shot) => (
    <>
      <Headline shot={shot} text="特徴" />
      <Points at={[6, 20, 34]} items={["特徴", "特徴", "特徴"]} shot={shot} />
    </>
  ),
  insight: (shot) => (
    <>
      <Headline shot={shot} text="使ってわかったこと" />
      <Points at={[6, 20, 34]} items={["観点", "観点", "観点"]} shot={shot} />
    </>
  ),
  complaint: (shot) => (
    <>
      <Headline shot={shot} text="不満点" />
      <Points at={[6, 20]} items={["不満", "不満"]} shot={shot} />
    </>
  ),
  rating: (shot) => (
    <>
      <Headline shot={shot} text="おすすめ度" />
      <Rating at={[6, 10, 14, 18, 22, 30]} score={4} />
    </>
  ),
  ending: (shot) => (
    <>
      <Label text="ひとことで言うと" />
      <Headline at={3} shot={shot} slot="title" text="一言**まとめ**" />
      <Credits shot={shot} />
    </>
  ),
};
`;
