import { Array as Arr, Schema, pipe } from "effect";
import type { Option } from "effect";

import { VERDICTS } from "#/shared/config/index.ts";

export const BACH = "bach";

const StyleSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  baseline: Schema.String,
});

export type Style = typeof StyleSchema.Type;

const SongSchema = Schema.Struct({
  id: Schema.String,
  style: Schema.String,
  name: Schema.String,
  file: Schema.String,
  fumx: Schema.String,
  imported: Schema.String,
});

export type Song = typeof SongSchema.Type;

const AimSchema = Schema.Struct({
  id: Schema.String,
  style: Schema.String,
  category: Schema.String,
  name: Schema.String,
});

export type Aim = typeof AimSchema.Type;

const JudgmentSchema = Schema.Struct({
  style: Schema.String,
  habit: Schema.String,
  context: Schema.String,
  next: Schema.String,
  verdict: Schema.Literals(VERDICTS),
  aim: Schema.optionalKey(Schema.String),
  reason: Schema.optionalKey(Schema.String),
});

export type Judgment = typeof JudgmentSchema.Type;

export const LibrarySchema = Schema.Struct({
  styles: Schema.Array(StyleSchema),
  songs: Schema.Array(SongSchema),
  aims: Schema.Array(AimSchema),
  judgments: Schema.Array(JudgmentSchema),
});

export type Library = typeof LibrarySchema.Type;

export const EMPTY_LIBRARY: Library = { styles: [], songs: [], aims: [], judgments: [] };

export type Change = (library: Library) => Library;

export type HabitOf = Readonly<{ style: string; habit: string }>;

export type CategoryOf = Readonly<{ style: string; category: string }>;

export const withStyle =
  (style: Style): Change =>
  (library) => ({ ...library, styles: Arr.append(library.styles, style) });

export const withSongs =
  (songs: readonly Song[]): Change =>
  (library) => ({ ...library, songs: Arr.appendAll(library.songs, songs) });

export const withoutSong =
  (id: string): Change =>
  (library) => ({
    ...library,
    songs: pipe(
      library.songs,
      Arr.filter((song) => song.id !== id),
    ),
  });

const rebased =
  ({ style, baseline }: Readonly<{ style: string; baseline: string }>) =>
  (each: Style): Style => {
    if (each.id === style) {
      return { ...each, baseline };
    }
    return each;
  };

export const withBaseline =
  (target: Readonly<{ style: string; baseline: string }>): Change =>
  (library) => ({ ...library, styles: pipe(library.styles, Arr.map(rebased(target))) });

export const withAim =
  (aim: Aim): Change =>
  (library) => ({ ...library, aims: Arr.append(library.aims, aim) });

const sameHabit =
  ({ style, habit }: HabitOf) =>
  (judgment: Judgment): boolean =>
    judgment.style === style && judgment.habit === habit;

export const withoutJudgment =
  (target: HabitOf): Change =>
  (library) => ({
    ...library,
    judgments: pipe(
      library.judgments,
      Arr.filter((each) => !sameHabit(target)(each)),
    ),
  });

export const withJudgment =
  (judgment: Judgment): Change =>
  (library) => {
    const rest = withoutJudgment(judgment)(library);
    return { ...rest, judgments: Arr.append(rest.judgments, judgment) };
  };

export const judgmentOf =
  (library: Library) =>
  (target: HabitOf): Option.Option<Judgment> =>
    pipe(library.judgments, Arr.findFirst(sameHabit(target)));

export const songsOf =
  (library: Library) =>
  (style: string): readonly Song[] =>
    pipe(
      library.songs,
      Arr.filter((song) => song.style === style),
    );

export const aimsOf =
  (library: Library) =>
  ({ style, category }: CategoryOf): readonly Aim[] =>
    pipe(
      library.aims,
      Arr.filter((aim) => aim.style === style && aim.category === category),
    );

export const judgmentsIn =
  (library: Library) =>
  (aim: string): readonly Judgment[] =>
    pipe(
      library.judgments,
      Arr.filter((judgment) => judgment.aim === aim),
    );

export type CategoryCounts = Readonly<{ aims: number; rules: number; suggestions: number }>;

export const countsOf =
  (library: Library) =>
  (target: CategoryOf): CategoryCounts => {
    const aims = aimsOf(library)(target);
    const judged = pipe(
      aims,
      Arr.flatMap((aim) => judgmentsIn(library)(aim.id)),
    );
    return {
      aims: aims.length,
      rules: pipe(
        judged,
        Arr.countBy((judgment) => judgment.verdict !== "suggest"),
      ),
      suggestions: pipe(
        judged,
        Arr.countBy((judgment) => judgment.verdict === "suggest"),
      ),
    };
  };
