import { Record as Rec, String as Str, pipe } from "effect";

const CREDENTIALS: ReadonlySet<string> = new Set(["authorization", "cookie"]);

const isCredential = (name: string): boolean =>
  CREDENTIALS.has(name) || Str.startsWith("cf-access-")(name);

export const withoutCredentials = (request: Request): Headers =>
  new Headers(
    pipe(
      Rec.fromEntries(request.headers),
      Rec.filter((_value, name) => !isCredential(name)),
    ),
  );
