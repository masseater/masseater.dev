import { FlaskConical, Tag } from "lucide-react";
import type { ReactNode } from "react";

import { SITE_TITLE } from "#/shared/config";
import { MethodLink } from "#/shared/ui/method-link";
import { NoteList } from "#/shared/ui/note-list";
import type { Note } from "#/shared/ui/note-list";
import { PageShell } from "#/widgets/page-shell";

import { EnglishSection } from "./english-section";
import { IndexSection } from "./index-section";
import { TaskLinks } from "./task-links";

const NOTES: readonly Note[] = [
  {
    icon: <Tag aria-hidden="true" />,
    text: "正解ラベルは Claude Opus 5.5 が付けたもの（JNLI は人のラベル）",
  },
  { icon: <FlaskConical aria-hidden="true" />, text: "勉強目的の実験" },
];

const HEADER = (
  <>
    <h1 className="text-2xl font-bold">{SITE_TITLE}</h1>
    <NoteList notes={NOTES} />
    <MethodLink />
  </>
);

const LeaderboardPage = (): ReactNode => (
  <PageShell header={HEADER}>
    <TaskLinks />
    <IndexSection />
    <EnglishSection />
  </PageShell>
);

export { LeaderboardPage };
