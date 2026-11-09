import { Option, String, pipe } from "effect";

type Output =
  | Readonly<{ status: "empty" }>
  | Readonly<{ status: "translating" }>
  | Readonly<{ status: "translated"; text: string; stale: boolean }>
  | Readonly<{ status: "failed"; message: string }>;

type QueryView = Readonly<{
  data: Option.Option<string>;
  failure: Option.Option<string>;
  isPlaceholderData: boolean;
}>;

const outputOf = ({ draft, query }: Readonly<{ draft: string; query: QueryView }>): Output => {
  if (pipe(draft, String.trim, String.isEmpty)) {
    return { status: "empty" };
  }
  if (Option.isSome(query.failure)) {
    return { status: "failed", message: query.failure.value };
  }
  const text = pipe(query.data, Option.filter(String.isNonEmpty));
  if (Option.isNone(text)) {
    return { status: "translating" };
  }
  return { status: "translated", text: text.value, stale: query.isPlaceholderData };
};

export { outputOf };
export type { Output, QueryView };
