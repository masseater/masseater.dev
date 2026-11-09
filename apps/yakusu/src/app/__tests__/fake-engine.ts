import { Option, Stream, String, pipe } from "effect";

import type { Engine } from "#/shared/api";

type TranslateRequest = Engine["translate"] extends (request: infer Request) => unknown
  ? Request
  : never;

const BROKEN = "壊れた";

const FAILURE = "翻訳エンジンが起動しません";

const translated = (request: TranslateRequest): string => {
  const form = pipe(
    request.form,
    Option.map((choice) => ` ${choice}`),
    Option.getOrElse(() => ""),
  );
  return `${String.toUpperCase(request.target)}${form}: ${request.text}`;
};

const reply = (request: TranslateRequest): Stream.Stream<string, Readonly<{ message: string }>> =>
  pipe(
    Option.liftPredicate(request.text, String.includes(BROKEN)),
    Option.match({
      onNone: () => Stream.fromIterable(translated(request)),
      onSome: () => Stream.fail({ message: FAILURE }),
    }),
  );

type FakeEngine = Readonly<{ engine: Engine; requests: readonly TranslateRequest[] }>;

const fakeEngine = (): FakeEngine => {
  const requests: TranslateRequest[] = [];
  return {
    requests,
    engine: {
      translate: (request) => {
        requests.push(request);
        return Stream.toAsyncIterable(reply(request));
      },
    },
  };
};

export { fakeEngine };
export type { FakeEngine, TranslateRequest };
