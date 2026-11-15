import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Effect } from "effect";
import { useEffect } from "react";

import { tauriWindow } from "#/shared/api";
import { flushAll } from "#/shared/model";

const CLOSING_EVENT = "yohaku://closing";
const EDITABLE = 'input, textarea, [contenteditable="true"]';

const keepNativeMenuOnlyInText = (event: MouseEvent): void => {
  const editable = event.target instanceof Element && event.target.closest(EDITABLE) !== null;
  if (!editable) {
    event.preventDefault();
  }
};

const closing = (quit: boolean): Effect.Effect<unknown> =>
  flushAll.pipe(Effect.andThen(tauriWindow.finishClosing(quit)));

export const behaveLikeAnApp = (): void => {
  document.addEventListener("contextmenu", keepNativeMenuOnlyInText);
  if (!isTauri()) {
    return;
  }
  Effect.runFork(
    Effect.promise(() =>
      listen<boolean>(CLOSING_EVENT, ({ payload }) => {
        Effect.runFork(closing(payload));
      }),
    ),
  );
};

export const useShownOnceReady = (ready: boolean): void => {
  useEffect(() => {
    if (ready && isTauri()) {
      Effect.runFork(tauriWindow.ready());
    }
  }, [ready]);
};
