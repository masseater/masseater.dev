import type { ReactNode } from "react";

import type { MemoValue, RevisionValue } from "#/entities/watashi/index.ts";
import { MemoEditor, RetractSlot } from "#/features/edit-memo/index.ts";
import { Section } from "#/shared/ui/index.ts";

import { MemoHeader } from "./memo-header.tsx";
import { RevisionList } from "./revision-list.tsx";

const HISTORY = "履歴";

export const MemoArticle = ({
  memo,
  revisions,
}: Readonly<{ memo: MemoValue; revisions: readonly RevisionValue[] }>): ReactNode => (
  <div className="grid items-start gap-5 xl:grid-cols-3">
    <article className="bg-card flex min-w-0 flex-col gap-6 rounded-xl border p-5 sm:p-6 xl:col-span-2">
      <MemoHeader memo={memo} />
      <MemoEditor key={memo.content} memo={memo} />
      <RetractSlot memo={memo} />
    </article>
    <Section title={HISTORY}>
      <RevisionList memo={memo} revisions={revisions} />
    </Section>
  </div>
);
