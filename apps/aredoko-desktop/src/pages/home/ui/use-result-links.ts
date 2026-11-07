import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { Option, pipe } from "effect";

import { usePackage } from "#/pages/home/api/queries";

interface ResultLinks {
  readonly file: Option.Option<string>;
  readonly revealed: Option.Option<string>;
  readonly booth: Option.Option<string>;
}

const useResultLinks = (result: typeof SearchResult.Type): ResultLinks => {
  const owner = usePackage(Option.some(result.packageId));
  const file = Option.fromNullOr(result.file);
  return {
    file,
    revealed: pipe(
      file,
      Option.orElse(() =>
        pipe(
          owner,
          Option.map(({ path }) => path),
        ),
      ),
    ),
    booth: pipe(
      owner,
      Option.flatMap(({ booth }) => Option.fromNullOr(booth)),
      Option.map(({ url }) => url),
    ),
  };
};

export { useResultLinks };
