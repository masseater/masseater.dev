import { MousePointerClick, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";

import type { TaskEntry } from "#/pages/leaderboard/model/ranking";

import { ReliabilityChart } from "./charts/reliability-chart";
import { NoteList } from "./note-list";
import type { Note } from "./note-list";
import { Section } from "./section";

const TITLE = "確信度と実際の正解率";

const NOTES: readonly Note[] = [
  { icon: <TrendingDown aria-hidden="true" />, text: "対角線より下は過信" },
  {
    icon: <MousePointerClick aria-hidden="true" />,
    text: "凡例をクリックで表示を切り替え、ホバーでそのモデルを強調",
  },
];

const ReliabilitySection = ({
  task,
  entries,
}: Readonly<{ task: string; entries: readonly TaskEntry[] }>): ReactNode => (
  <Section id="calibration" title={TITLE}>
    <NoteList notes={NOTES} />
    <ReliabilityChart task={task} title={TITLE} entries={entries} />
  </Section>
);

export { ReliabilitySection };
