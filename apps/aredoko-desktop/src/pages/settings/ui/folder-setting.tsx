import type { ReactNode } from "react";

import { AddKnownFolderButton, AddFolderButton, SourceList } from "#/features/library";

const TITLE = "フォルダ";

const FolderSetting = (): ReactNode => (
  <section className="flex flex-col gap-2">
    <h3 className="text-sm font-medium">{TITLE}</h3>
    <SourceList />
    <div className="flex flex-wrap gap-2">
      <AddKnownFolderButton folder="assetStore" />
      <AddKnownFolderButton folder="blm" />
      <AddFolderButton />
    </div>
  </section>
);

export { FolderSetting };
