import { Array as Arr, pipe } from "effect";

import type { InterviewSummary } from "#protocol";

export const SECTIONS = [
  { key: "points", heading: "分かったこと" },
  { key: "open", heading: "気になること" },
  { key: "next", heading: "まだ聞いていないこと" },
] as const;

const bulleted = (items: readonly string[]): readonly string[] =>
  pipe(
    items,
    Arr.map((item) => `- ${item}`),
  );

export const handoffOf = (summary: InterviewSummary): string =>
  pipe(
    SECTIONS,
    Arr.filter(({ key }) => Arr.isReadonlyArrayNonEmpty(summary[key])),
    Arr.flatMap(({ key, heading }) => ["", `## ${heading}`, "", ...bulleted(summary[key])]),
    Arr.prepend(`# ${summary.theme}`),
    Arr.join("\n"),
  );
