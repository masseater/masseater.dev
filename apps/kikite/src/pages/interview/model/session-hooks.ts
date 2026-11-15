import { useAtomMount, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useCallback } from "react";

import { phaseAtom } from "#/entities/interview";

import { sessionAtom } from "./session.ts";
import type { Session } from "./session.ts";

const useRunSession = (): void => {
  useAtomMount(sessionAtom);
};

const useSession = (): Option.Option<Session> => AsyncResult.value(useAtomValue(sessionAtom));

const useWrapUp = (): (() => void) => {
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

export { useRunSession, useSession, useWrapUp };
