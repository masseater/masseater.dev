import { Effect } from "effect";

const LANGUAGE = "ja-JP";
const RATE = 1.15;

const speak = (text: string): Effect.Effect<void> =>
  Effect.callback((resume: (effect: Effect.Effect<void>) => void) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE;
    utterance.rate = RATE;
    const done = (): void => {
      resume(Effect.void);
    };
    utterance.addEventListener("end", done);
    utterance.addEventListener("error", done);
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    return Effect.sync(() => {
      speechSynthesis.cancel();
    });
  });

export { speak };
