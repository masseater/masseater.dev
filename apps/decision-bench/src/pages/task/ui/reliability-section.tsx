import { MousePointerClick, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";

import type { TaskEntry } from "#/entities/benchmark/index.ts";
import { ReliabilityChart } from "#/entities/benchmark/index.ts";
import { NoteList } from "#/shared/ui/note-list.tsx";
import type { Note } from "#/shared/ui/note-list.tsx";
import { Section } from "#/shared/ui/section.tsx";

const TITLE = "確信度と実際の正解率";

const NOTES: readonly Note[] = [
  { icon: <TrendingDown aria-hidden="true" />, text: "対角線より下は過信" },
  {
    icon: <MousePointerClick aria-hidden="true" />,
    text: "凡例をクリックで表示を切り替え、ホバーでそのモデルを強調",
  },
];

export const ReliabilitySection = ({
  task,
  entries,
}: Readonly<{ task: string; entries: readonly TaskEntry[] }>): ReactNode => (
  <Section id="calibration" title={TITLE}>
    <NoteList notes={NOTES} />
    <ReliabilityChart task={task} title={TITLE} entries={entries} />
  </Section>
);
