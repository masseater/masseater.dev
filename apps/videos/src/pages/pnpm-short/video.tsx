import type { Draw, Shot } from "@masseater.dev/video-kit";
import { Credits, Headline, Label, Points, Rating, Sfx, Tags } from "@masseater.dev/video-kit";
import type { ReactNode } from "react";

const TAGS = ["2016年〜", "OSS・Rico Sta. Cruz発", "最新はRust製のv12"] as const;
const TAG_AT = [10, 16, 22] as const;
const POINT_AT = [8, 22, 36] as const;
const STAR_AT = [6, 10, 14, 18, 22, 30] as const;
const FEATURES = [
  "インストールが**速い**",
  "実体はPCに1つだけ",
  "書いてない依存は読めない",
] as const;
const INSIGHTS = [
  "`catalog`で版を一か所に",
  "出たての版を**待てる**",
  "パッチも設定ファイルに",
] as const;
const COMPLAINTS = [
  "平置き前提のツールが動かない",
  "型エラーが出ることも",
  "逃げ道は`hoisted`設定",
] as const;
const HEADING_AT = 0;
const ENDING_TITLE_AT = 4;

const Section = ({
  shot,
  title,
  items,
}: Readonly<{ shot: Shot; title: string; items: readonly string[] }>): ReactNode => (
  <>
    <Headline shot={shot} text={title} />
    <Sfx at={HEADING_AT} kind="stamp" shot={shot} />
    <Points at={POINT_AT} items={items} shot={shot} />
    <Sfx at={POINT_AT[0]} kind="pop" shot={shot} />
    <Sfx at={POINT_AT[1]} kind="pop" shot={shot} />
    <Sfx at={POINT_AT[2]} kind="pop" shot={shot} />
  </>
);

export const draw: Readonly<Record<string, Draw>> = {
  opening: (shot) => (
    <>
      <Headline shot={shot} slot="name" text="**pnpm**" />
      <Sfx at={HEADING_AT} kind="hook" shot={shot} />
      <Tags at={TAG_AT} items={TAGS} />
    </>
  ),
  features: (shot) => <Section items={FEATURES} shot={shot} title="特徴" />,
  insight: (shot) => <Section items={INSIGHTS} shot={shot} title="使ってわかったこと" />,
  complaints: (shot) => <Section items={COMPLAINTS} shot={shot} title="不満点" />,
  rating: (shot) => (
    <>
      <Headline shot={shot} text="おすすめ度" />
      <Sfx at={HEADING_AT} kind="stamp" shot={shot} />
      <Rating at={STAR_AT} score={4} />
      <Sfx at={STAR_AT[5]} kind="pop" shot={shot} />
    </>
  ),
  ending: (shot) => (
    <>
      <Label text="ひとことで言うと" />
      <Headline at={ENDING_TITLE_AT} shot={shot} slot="title" text="迷ったら**pnpm**でいい" />
      <Sfx at={HEADING_AT} kind="ending" shot={shot} />
      <Credits shot={shot} />
    </>
  ),
};
