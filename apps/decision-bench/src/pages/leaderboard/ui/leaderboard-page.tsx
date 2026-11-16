import { FlaskConical, Tag } from "lucide-react";
import type { ReactNode } from "react";

import { SITE_TITLE } from "#/shared/config/index.ts";
import { MethodLink } from "#/shared/ui/method-link.tsx";
import { NoteList } from "#/shared/ui/note-list.tsx";
import type { Note } from "#/shared/ui/note-list.tsx";
import { PageShell } from "#/widgets/page-shell/index.ts";

import { EnglishSection } from "./english-section.tsx";
import { IndexSection } from "./index-section.tsx";
import { TaskLinks } from "./task-links.tsx";

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

export const LeaderboardPage = (): ReactNode => (
  <PageShell header={HEADER}>
    <TaskLinks />
    <IndexSection />
    <EnglishSection />
  </PageShell>
);
