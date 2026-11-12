import type { Manuscript } from "@masseater.dev/yohaku-protocol";
import { Button } from "@masseater.dev/ui/button";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import type { ReactNode } from "react";

import { useYohaku } from "#/shared/api";
import { NEW_MANUSCRIPT, opened, useScreen } from "#/shared/model";
import { AppHeader } from "#/shared/ui";

const nameOf = ({ title, excerpt }: typeof Manuscript.Type): string =>
  title === null ? excerpt : title.text;

const ManuscriptRow = ({ manuscript }: Readonly<{ manuscript: typeof Manuscript.Type }>): ReactNode => {
  const [screen, setScreen] = useScreen();
  return (
    <li className="border-b">
      <button
        type="button"
        onClick={() => setScreen(opened(screen, manuscript.id))}
        className="flex w-full flex-col gap-1 py-3 text-left"
      >
        <span className="truncate font-bold">{nameOf(manuscript)}</span>
        {manuscript.title === null ? null : (
          <span className="truncate font-serif text-sm text-muted-foreground">
            {manuscript.excerpt}
          </span>
        )}
      </button>
    </li>
  );
};

const ManuscriptsPage = (): ReactNode => {
  const yohaku = useYohaku();
  const [screen, setScreen] = useScreen();
  const { data = [] } = useQuery(
    queryOptions({ queryKey: ["manuscripts"], queryFn: yohaku.listManuscripts }),
  );
  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 overflow-y-auto px-6 py-10">
        <Button className="self-start" onClick={() => setScreen(opened(screen, NEW_MANUSCRIPT))}>
          <PenLine aria-hidden="true" />
          新しく書く
        </Button>
        <ul aria-label="原稿">
          {data.map((manuscript) => (
            <ManuscriptRow key={manuscript.id} manuscript={manuscript} />
          ))}
        </ul>
      </main>
    </div>
  );
};

export { ManuscriptsPage };
