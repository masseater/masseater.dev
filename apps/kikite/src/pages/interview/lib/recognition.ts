import { Effect, Option } from "effect";
import type { Scope } from "effect";

import { transcriptsOf } from "./transcripts.ts";

type RecognitionHandlers = Readonly<{
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onFailed: (message: string) => void;
  onSound: (hearing: boolean) => void;
}>;

interface Recognition {
  readonly mute: () => void;
  readonly unmute: () => void;
}

type RecognizerClass = new () => SpeechRecognition;

const LANGUAGE = "ja-JP";
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
  readonly #recognizer: SpeechRecognition;
  readonly #handlers: RecognitionHandlers;
  #wanted = true;
  #muted = false;
  #running = false;

  public constructor(Recognizer: RecognizerClass, handlers: RecognitionHandlers) {
    this.#recognizer = new Recognizer();
    this.#handlers = handlers;
    this.#recognizer.lang = LANGUAGE;
    this.#recognizer.continuous = true;
    this.#recognizer.interimResults = true;
    this.#subscribe();
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

  readonly #subscribe = (): void => {
    this.#recognizer.addEventListener("result", this.#heard);
    this.#recognizer.addEventListener("error", this.#failed);
    this.#recognizer.addEventListener("end", this.#ended);
    this.#recognizer.addEventListener("soundstart", this.#soundStarted);
    this.#recognizer.addEventListener("soundend", this.#soundEnded);
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

  readonly #soundStarted = (): void => {
    this.#handlers.onSound(true);
  };

  readonly #soundEnded = (): void => {
    this.#handlers.onSound(false);
  };

  readonly #ended = (): void => {
    this.#running = false;
    this.#handlers.onSound(false);
    this.#resume();
  };

  readonly #resume = (): void => {
    if (this.#wanted && !this.#muted && !this.#running) {
      this.#running = true;
      this.#recognizer.start();
    }
  };
}

const open = (
  Recognizer: RecognizerClass,
  handlers: RecognitionHandlers,
): Effect.Effect<Recognition, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => new Listener(Recognizer, handlers)),
    (listener) => Effect.sync(listener.stop),
  );

const listen = (
  handlers: RecognitionHandlers,
): Effect.Effect<Option.Option<Recognition>, never, Scope.Scope> =>
  Option.match(recognizerClass(), {
    onNone: () => Effect.succeedNone,
    onSome: (Recognizer) => Effect.asSome(open(Recognizer, handlers)),
  });

export { listen };
export type { Recognition };
