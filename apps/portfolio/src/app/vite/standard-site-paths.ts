import { Array as Arr, Option, String as Str, pipe } from "effect";

const BLOGS_PREFIX = "/blogs/";

const SLOG_PREFIX = "/slog/";

export const movedDocumentPath = ({
  slugs,
  path,
}: Readonly<{ slugs: readonly string[]; path: string }>): Option.Option<string> =>
  pipe(
    Option.liftPredicate(path, Str.startsWith(BLOGS_PREFIX)),
    Option.map(Str.slice(BLOGS_PREFIX.length)),
    Option.filter((slug) => Arr.contains(slugs, slug)),
    Option.map((slug) => `${SLOG_PREFIX}${slug}`),
  );
