import { useAtom } from "@effect/atom-react";
import type { Atom } from "effect/reactivity";
import { useCallback } from "react";
import type { SubmitEvent } from "react";

/** @internal */
export const useSubmit = <Failure>(
  save: Readonly<Atom.AtomResultFn<void, void, Failure>>,
): Readonly<{ waiting: boolean; submit: (event: SubmitEvent<HTMLFormElement>) => void }> => {
  const [saved, run] = useAtom(save);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      run();
    },
    [run],
  );
  return { waiting: saved.waiting, submit };
};
