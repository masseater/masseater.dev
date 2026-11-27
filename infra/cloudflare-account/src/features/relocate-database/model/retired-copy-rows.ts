import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Effect } from "effect";

const COPY_ROWS = "Masseater.CopyRows";

type CopyRowsProps = Readonly<{ source: string; target: string }>;

type CopyRowsResource = Resource<typeof COPY_ROWS, CopyRowsProps, CopyRowsProps>;

const CopyRows = Resource<CopyRowsResource>(COPY_ROWS);

/** @internal */
export const retiredCopyRowsProvider = succeed(CopyRows, {
  reconcile: ({ news }) => Effect.succeed(news),
  delete: () => Effect.void,
});
