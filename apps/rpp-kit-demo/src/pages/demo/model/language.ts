import { autocompletion } from "@codemirror/autocomplete";
import type { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import { hoverTooltip } from "@codemirror/view";
import type { EditorView, Tooltip } from "@codemirror/view";
import type { Remote } from "comlink";
import { Array as Arr, Boolean as Bool, Effect, pipe } from "effect";

import type { Completion, Hover, Lint } from "./checker";
import type { CheckerWorker } from "./checker.worker";

type Pane = Readonly<{ worker: Remote<CheckerWorker>; path: string }>;

const COMPLETION_TRIGGER = /[\w$]+|[."'`]/u;

const hoverDom = ({ text, documentation }: Hover): HTMLElement => {
  const dom = document.createElement("div");
  dom.className = "cm-ts-hover";
  const signature = document.createElement("code");
  signature.textContent = text;
  const note = document.createElement("p");
  note.textContent = documentation;
  dom.append(
    signature,
    ...pipe(
      [note],
      Arr.filter(() => documentation !== ""),
    ),
  );
  return dom;
};

const tooltipsOf =
  (position: number) =>
  (hovers: readonly Hover[]): readonly Tooltip[] =>
    pipe(
      hovers,
      Arr.map((hover) => ({
        pos: position,
        above: true,
        create: () => ({ dom: hoverDom(hover) }),
      })),
    );

const hoversAt = (
  { worker, path }: Pane,
  view: EditorView,
  position: number,
): Effect.Effect<readonly Hover[]> =>
  Effect.promise(() => worker.hover({ path, code: view.state.doc.toString(), position }));

const tooltipsAt = (
  pane: Pane,
  view: EditorView,
  position: number,
): Promise<readonly Tooltip[]> => {
  const tooltips = tooltipsOf(position);
  return Effect.runPromise(hoversAt(pane, view, position).pipe(Effect.map(tooltips)));
};

const typeHover = (pane: Pane): Extension =>
  hoverTooltip((view, position) => tooltipsAt(pane, view, position));

const diagnosticOf = ({ from, to, severity, message }: Lint): Diagnostic => ({
  from,
  to,
  severity,
  message,
});

const lintsOf =
  ({ worker, path }: Pane) =>
  (view: EditorView): Effect.Effect<readonly Diagnostic[]> =>
    Effect.promise(() => worker.lint({ path, code: view.state.doc.toString() })).pipe(
      Effect.map(Arr.map(diagnosticOf)),
    );

const requested = (context: CompletionContext): boolean =>
  context.explicit || context.matchBefore(COMPLETION_TRIGGER) !== null;

const completionAt = (
  { worker, path }: Pane,
  context: CompletionContext,
): Effect.Effect<Completion> =>
  Effect.promise(() =>
    worker.complete({ path, code: context.state.doc.toString(), position: context.pos }),
  );

const resultOf = ({ from, options }: Completion): CompletionResult => ({
  from,
  options: [...options],
});

const typeCompletion = (pane: Pane): Extension =>
  autocompletion({
    override: [
      (context): Promise<CompletionResult> =>
        Effect.runPromise(
          Bool.match(requested(context), {
            onTrue: () => completionAt(pane, context).pipe(Effect.map(resultOf)),
            onFalse: () => Effect.succeed(resultOf({ from: context.pos, options: [] })),
          }),
        ),
    ],
  });

export { lintsOf, typeCompletion, typeHover };
