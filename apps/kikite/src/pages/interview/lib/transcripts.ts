import { Array as Arr, Option, pipe } from "effect";

type Transcripts = Readonly<{ finals: readonly string[]; interim: string }>;

const FIRST_ALTERNATIVE = 0;

const textOf = (result: SpeechRecognitionResult): string =>
  pipe(
    Option.fromUndefinedOr(result[FIRST_ALTERNATIVE]),
    Option.match({ onNone: () => "", onSome: (alternative) => alternative.transcript }),
  );

const resultsOf = (event: SpeechRecognitionEvent): readonly SpeechRecognitionResult[] =>
  Arr.makeBy(event.results.length - event.resultIndex, (offset) =>
    event.results.item(event.resultIndex + offset),
  );

const transcriptsOf = (event: SpeechRecognitionEvent): Transcripts => {
  const results = resultsOf(event);
  return {
    finals: pipe(
      results,
      Arr.filter((result) => result.isFinal),
      Arr.map(textOf),
    ),
    interim: pipe(
      results,
      Arr.filter((result) => !result.isFinal),
      Arr.map(textOf),
      Arr.join(""),
    ),
  };
};

export { transcriptsOf };
