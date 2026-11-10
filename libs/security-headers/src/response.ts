import { Array as Arr, Effect, Function, Option, Record as Rec, pipe } from "effect";

import { SERVER_RESPONSE_HEADERS } from "./index.ts";

const addMissingHeaders = (response: Response): Response => {
  const missing = pipe(
    Rec.toEntries(SERVER_RESPONSE_HEADERS),
    Arr.filter(([name]) => !response.headers.has(name)),
  );
  for (const [name, value] of missing) {
    response.headers.set(name, value);
  }
  return response;
};

const addInPlace = Option.liftThrowable(addMissingHeaders);

const withSecurityHeaders = (response: Response): Response =>
  pipe(
    addInPlace(response),
    Option.getOrElse(() => addMissingHeaders(new Response(response.body, response))),
  );

const securing =
  <Settled>(responseOf: (settled: Settled) => Response) =>
  (serve: () => PromiseLike<Settled> | Settled): Promise<Response> => {
    const pending = Promise.resolve(serve());
    return Effect.runPromise(
      Effect.promise(() => pending).pipe(
        Effect.map((settled) => withSecurityHeaders(responseOf(settled))),
      ),
    );
  };

const securedResponse = securing<Response>(Function.identity);

const securedResult = securing(({ response }: Readonly<{ response: Response }>) => response);

export { securedResponse, securedResult };
