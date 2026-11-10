import { Button } from "@masseater.dev/web-ui";
import { LockKeyhole } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { InspectState } from "#/pages/inspect/api/use-inspect";
import { COPY } from "#/pages/inspect/model/copy";
import {
  NO_FOCUS,
  unreadableOf,
  useApiKey,
  useDraftText,
  useFormat,
  useModel,
  useOpening,
  useRun,
  useSetFocus,
  useSetRun,
} from "#/pages/inspect/model/draft";
import type { Run } from "#/pages/inspect/model/draft";

import { Note } from "./note";
import { OverlaidText } from "./overlaid-text";
import { RunSettings } from "./run-settings";
import { SourceBar } from "./source-bar";

const NON_BLANK = /\S/u;

const FIRST_RUN = 0;

const NEXT = 1;

const nextIdOf = (run: Run): number => {
  if (run.status === "started") {
    return run.id + NEXT;
  }
  return FIRST_RUN;
};

const isRunning = (state: InspectState): boolean =>
  state.status === "streaming" && state.trace.phase.status === "running";

const isReady = ({
  state,
  text,
  apiKey,
  model,
}: Readonly<{ state: InspectState; text: string; apiKey: string; model: string }>): boolean =>
  !isRunning(state) && NON_BLANK.test(text) && apiKey !== "" && NON_BLANK.test(model);

const InspectForm = ({ state }: Readonly<{ state: InspectState }>): ReactNode => {
  const text = useDraftText();
  const apiKey = useApiKey();
  const model = useModel();
  const format = useFormat();
  const opening = useOpening();
  const run = useRun();
  const setRun = useSetRun();
  const setFocus = useSetFocus();
  const submit = useCallback(() => {
    setFocus(NO_FOCUS);
    setRun({
      status: "started",
      id: nextIdOf(run),
      text,
      apiKey,
      model,
      format,
      unreadable: unreadableOf(opening),
    });
  }, [setFocus, setRun, run, text, apiKey, model, format, opening]);
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SourceBar />
      <OverlaidText state={state} />
      <div className="flex flex-wrap gap-2">
        <RunSettings />
        <Button disabled={!isReady({ state, text, apiKey, model })} onClick={submit}>
          {COPY.submit}
        </Button>
      </div>
      <Note text={COPY.keyNote}>
        <LockKeyhole />
      </Note>
    </section>
  );
};

export { InspectForm };
