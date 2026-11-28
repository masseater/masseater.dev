import { Array as Arr, Match, String as Str, pipe } from "effect";

const READ_ONLY_METHODS = ["GET", "HEAD", "OPTIONS"] as const;

export type RequestFacts = Readonly<{
  method: string;
  url: string;
  origin: string;
  isNavigation: boolean;
}>;

const originOf = (url: string): string => new URL(url).origin;

export const isReadOnly = (method: string): boolean =>
  pipe(
    READ_ONLY_METHODS,
    Arr.some((allowed) => allowed === Str.toUpperCase(method)),
  );

export type Answer = "abort" | "fulfill" | "continue";

const leavesOrigin = (request: RequestFacts): boolean =>
  request.isNavigation && originOf(request.url) !== request.origin;

const writes = (request: RequestFacts): boolean => !isReadOnly(request.method);

export const answerOf = (request: RequestFacts): Answer =>
  Match.value(request).pipe(
    Match.when(leavesOrigin, () => "abort" as const),
    Match.when(writes, () => "fulfill" as const),
    Match.orElse(() => "continue" as const),
  );

export const carriesBearer = (request: RequestFacts): boolean =>
  originOf(request.url) === request.origin;
