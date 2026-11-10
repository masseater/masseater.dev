import { Option, Stream, String, pipe } from "effect";

import type { Engine, Progress } from "#/shared/api";

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

type Failure = Readonly<{ message: string }>;

type Prepare = () => Stream.Stream<Progress, Failure>;

const fakeEngineWith = (prepare: Prepare): FakeEngine => {
  const requests: TranslateRequest[] = [];
  return {
    requests,
    engine: {
      prepare: () => Stream.toAsyncIterable(prepare()),
      translate: (request) => {
        requests.push(request);
        return Stream.toAsyncIterable(reply(request));
      },
    },
  };
};

const fakeEngine = (): FakeEngine => fakeEngineWith(() => Stream.empty);

export { fakeEngine, fakeEngineWith };
export type { FakeEngine, Failure, Prepare, TranslateRequest };
