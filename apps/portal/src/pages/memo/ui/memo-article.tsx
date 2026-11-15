import type { ReactNode } from "react";

import type { MemoValue, RevisionValue } from "#/entities/watashi";
import { MemoEditor, RetractSlot } from "#/features/edit-memo";
import { Section } from "#/shared/ui";

import { MemoHeader } from "./memo-header";
import { RevisionList } from "./revision-list";

const HISTORY = "履歴";

export const MemoArticle = ({
  memo,
  revisions,
}: Readonly<{ memo: MemoValue; revisions: readonly RevisionValue[] }>): ReactNode => (
  <article className="flex flex-col gap-8">
    <MemoHeader memo={memo} />
    <MemoEditor key={memo.content} memo={memo} />
    <RetractSlot memo={memo} />
    <Section title={HISTORY}>
      <RevisionList memo={memo} revisions={revisions} />
    </Section>
  </article>
);
