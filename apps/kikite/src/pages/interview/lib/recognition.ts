import { Effect, FiberHandle, Option, Result } from "effect";
import type { Scope } from "effect";

import { transcriptsOf } from "./transcripts.ts";

type RecognitionHandlers = Readonly<{
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onFailed: (message: string) => void;
  onSound: (hearing: boolean) => void;
}>;

export interface Recognition {
  readonly mute: () => void;
  readonly unmute: () => void;
}

type Recognizer = Pick<
  SpeechRecognition,
  | "lang"
  | "continuous"
  | "interimResults"
  | "start"
  | "abort"
  | "addEventListener"
  | "removeEventListener"
>;

type RecognizerClass = new () => Recognizer;

type Later = (effect: Effect.Effect<void>) => unknown;

const LANGUAGE = "ja-JP";
const RETRY = "500 millis";
const START_TIMEOUT = "3 seconds";
const UNCONFIRMED = "start was not confirmed";
const FATAL_ERRORS: ReadonlySet<string> = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
]);

const recognizerClass = (): Option.Option<RecognizerClass> =>
  Option.firstSomeOf([
    Option.fromUndefinedOr(globalThis.SpeechRecognition),
    Option.fromUndefinedOr(globalThis.webkitSpeechRecognition),
  ]);

class Listener implements Recognition {
  readonly #Recognizer: RecognizerClass;
  readonly #handlers: RecognitionHandlers;
  readonly #later: Later;
  #recognizer: Recognizer;
  #wanted = true;
  #muted = false;
  #running = false;

  public constructor(Recognizer: RecognizerClass, handlers: RecognitionHandlers, later: Later) {
    this.#Recognizer = Recognizer;
    this.#handlers = handlers;
    this.#later = later;
    this.#recognizer = this.#fresh();
    this.#resume();
  }

  public readonly mute = (): void => {
    this.#muted = true;
    this.#recognizer.abort();
  };

  public readonly unmute = (): void => {
    this.#muted = false;
    this.#resume();
  };

  public readonly stop = (): void => {
    this.#wanted = false;
    this.#recognizer.abort();
  };

  readonly #fresh = (): Recognizer => {
    const recognizer = new this.#Recognizer();
    recognizer.lang = LANGUAGE;
    recognizer.continuous = true;
    recognizer.interimResults = true;
    this.#subscribe(recognizer);
    return recognizer;
  };

  readonly #subscribe = (recognizer: Recognizer): void => {
    recognizer.addEventListener("result", this.#heard);
    recognizer.addEventListener("error", this.#failed);
    recognizer.addEventListener("start", this.#started);
    recognizer.addEventListener("end", this.#ended);
    recognizer.addEventListener("soundstart", this.#soundStarted);
    recognizer.addEventListener("soundend", this.#soundEnded);
  };

  readonly #discard = (recognizer: Recognizer): void => {
    recognizer.removeEventListener("result", this.#heard);
    recognizer.removeEventListener("error", this.#failed);
    recognizer.removeEventListener("start", this.#started);
    recognizer.removeEventListener("end", this.#ended);
    recognizer.removeEventListener("soundstart", this.#soundStarted);
    recognizer.removeEventListener("soundend", this.#soundEnded);
    recognizer.abort();
  };

  readonly #renew = (reason: string): void => {
    this.#discard(this.#recognizer);
    this.#recognizer = this.#fresh();
    this.#running = false;
    this.#handlers.onSound(false);
    this.#later(
      Effect.delay(Effect.sync(this.#resume), RETRY).pipe(
        Effect.withSpan("kikite.recognition.renew", { attributes: { "kikite.reason": reason } }),
      ),
    );
  };

  readonly #heard = (event: SpeechRecognitionEvent): void => {
    if (this.#muted) {
      return;
    }
    const { finals, interim } = transcriptsOf(event);
    for (const text of finals) {
      this.#handlers.onFinal(text);
    }
    this.#handlers.onInterim(interim);
  };

  readonly #failed = (event: Readonly<{ error: string }>): void => {
    if (FATAL_ERRORS.has(event.error)) {
      this.#wanted = false;
      this.#handlers.onFailed(event.error);
    }
  };

  readonly #started = (): void => {
    this.#later(Effect.void);
  };

  readonly #soundStarted = (): void => {
    this.#handlers.onSound(true);
  };

  readonly #soundEnded = (): void => {
    this.#handlers.onSound(false);
  };

  readonly #ended = (): void => {
    this.#later(Effect.void);
    this.#running = false;
    this.#handlers.onSound(false);
    this.#resume();
  };

  readonly #resume = (): void => {
    if (!this.#wanted || this.#muted || this.#running) {
      return;
    }
    this.#running = true;
    this.#later(
      Effect.delay(
        Effect.sync(() => {
          this.#renew(UNCONFIRMED);
        }),
        START_TIMEOUT,
      ),
    );
    const recognizer = this.#recognizer;
    const started = Result.try({
      try: () => {
        recognizer.start();
      },
      catch: String,
    });
    if (Result.isFailure(started)) {
      this.#renew(started.failure);
    }
  };
}

const listenWith = (
  options: Readonly<{ Recognizer: RecognizerClass; handlers: RecognitionHandlers }>,
): Effect.Effect<Recognition, never, Scope.Scope> =>
  Effect.gen(function* listening() {
    const later = yield* FiberHandle.makeRuntime<never>();
    return yield* Effect.acquireRelease(
      Effect.sync(() => new Listener(options.Recognizer, options.handlers, later)),
      (listener) => Effect.sync(listener.stop),
    );
  });

export const listen = (
  handlers: RecognitionHandlers,
): Effect.Effect<Option.Option<Recognition>, never, Scope.Scope> =>
  Option.match(recognizerClass(), {
    onNone: () => Effect.succeedNone,
    onSome: (Recognizer) => Effect.asSome(listenWith({ Recognizer, handlers })),
  });
