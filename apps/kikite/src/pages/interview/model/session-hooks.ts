import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useCallback, useMemo } from "react";

import { phaseAtom } from "#/entities/interview/index.ts";
import type { Answering } from "#/features/answer-question/index.ts";

import { sessionAtom } from "./session.ts";
import type { Session } from "./session.ts";

export const useRunSession = (): void => {
  useAtomMount(sessionAtom);
};

const useSession = (): Option.Option<Session> => AsyncResult.value(useAtomValue(sessionAtom));

export const useWrapUp = (): (() => void) => {
  const session = useSession();
  const setPhase = useAtomSet(phaseAtom);
  return useCallback(() => {
    Option.match(session, {
      onNone: () => {
        setPhase({ status: "report" });
      },
      onSome: (current) => {
        current.wrapUp();
      },
    });
  }, [session, setPhase]);
};

export const useAnswering = (): Answering => {
  const session = useSession();
  return useMemo(
    () => ({
      typed: (text: string) => {
        if (Option.isSome(session)) {
          session.value.typed(text);
        }
      },
      typing: (text: string) => {
        if (Option.isSome(session)) {
          session.value.typing(text);
        }
      },
    }),
    [session],
  );
};
