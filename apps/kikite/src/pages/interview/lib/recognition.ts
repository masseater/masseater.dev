import { Effect, Option } from "effect";
import type { Scope } from "effect";

import { transcriptsOf } from "./transcripts.ts";

type RecognitionHandlers = Readonly<{
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onFailed: (message: string) => void;
}>;

interface Recognition {
  readonly mute: () => void;
  readonly unmute: () => void;
}

type RecognizerClass = new () => SpeechRecognition;

const LANGUAGE = "ja-JP";
const QUIET_ERRORS: ReadonlySet<string> = new Set(["no-speech", "aborted"]);

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
    this.#recognizer.addEventListener("result", this.#heard);
    this.#recognizer.addEventListener("error", this.#failed);
    this.#recognizer.addEventListener("end", this.#ended);
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
    if (!QUIET_ERRORS.has(event.error)) {
      this.#handlers.onFailed(event.error);
    }
  };

  readonly #ended = (): void => {
    this.#running = false;
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
