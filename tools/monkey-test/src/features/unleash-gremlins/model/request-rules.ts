import { Array as Arr, String as Str, pipe } from "effect";

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

export const shouldAbort = (request: RequestFacts): boolean =>
  !isReadOnly(request.method) || (request.isNavigation && originOf(request.url) !== request.origin);

export const carriesBearer = (request: RequestFacts): boolean =>
  originOf(request.url) === request.origin;
