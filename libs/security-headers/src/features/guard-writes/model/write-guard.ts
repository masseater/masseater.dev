import { Option, pipe } from "effect";

const READS: ReadonlySet<string> = new Set(["GET", "HEAD", "OPTIONS"]);
const JSON_BODY = /^application\/json(?:;|$)/iu;

const headerOf = (request: Request, name: string): Option.Option<string> =>
  Option.fromNullishOr(request.headers.get(name));

const writes = (request: Request): boolean => !READS.has(request.method);

export const writesFromAnotherSite = (request: Request): boolean =>
  writes(request) &&
  pipe(
    headerOf(request, "origin"),
    Option.exists((origin) => origin !== new URL(request.url).origin),
  );

export const writesWithoutJson = (request: Request): boolean =>
  writes(request) &&
  !pipe(
    headerOf(request, "content-type"),
    Option.exists((type) => JSON_BODY.test(type)),
  );
