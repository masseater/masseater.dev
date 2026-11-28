import { Array as Arr, Option, Order, pipe } from "effect";

const PAGE_LIMIT = 12;
const DOCUMENT_PATH = /^(?:[^.]*|.*\.html?)$/u;

const parsed = (href: string, base: string): Option.Option<URL> =>
  Option.liftThrowable((text: string) => new URL(text, base))(href);

const withoutFragment = (url: URL): string => `${url.origin}${url.pathname}${url.search}`;

export const pagesOf = (
  input: Readonly<{ origin: string; hrefs: readonly string[] }>,
): readonly string[] => {
  const root = `${input.origin}/`;
  const linked = pipe(
    input.hrefs,
    Arr.flatMap((href) => Option.toArray(parsed(href, root))),
    Arr.filter((url) => url.origin === input.origin && DOCUMENT_PATH.test(url.pathname)),
    Arr.map(withoutFragment),
    Arr.filter((url) => url !== root),
    Arr.dedupe,
    Arr.sortWith((url) => url, Order.String),
    Arr.take(PAGE_LIMIT),
  );
  return [root, ...linked];
};
