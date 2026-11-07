import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useFolderName, useSources } from "#/features/library/api/queries";
import { Loading } from "#/shared/ui/loading";
import { Notice } from "#/shared/ui/notice";

import { SourceRow } from "./source-row.tsx";

const SourceList = (): ReactNode => {
  const sources = useSources();
  const nameOf = useFolderName();
  if (sources.isPending) {
    return <Loading />;
  }
  if (sources.isError) {
    return <Notice tone="error">{sources.error.message}</Notice>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {pipe(
        sources.data,
        Array.map((source) => (
          <SourceRow key={source.id} source={source} named={nameOf(source.path)} />
        )),
      )}
    </ul>
  );
};

export { SourceList };
