import { Effect, Queue } from "effect";
import type { Page } from "playwright";

import type { LogItem } from "#/features/unleash-gremlins/model/observation-log.ts";

const SERVER_ERROR = 500;

const watchPage = Effect.fn("monkey.watchPage")(function* watchPage(page: Page) {
  const log = yield* Queue.unbounded<LogItem>();
  const offer = (item: LogItem): void => {
    Queue.offerUnsafe(log, item);
  };
  page.on("pageerror", (error) => {
    offer({ _tag: "event", source: "error", text: error.message });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      offer({ _tag: "event", source: "error", text: message.text() });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= SERVER_ERROR) {
      offer({
        _tag: "event",
        source: "server-error",
        text: `${String(response.status())} ${response.url()}`,
      });
    }
  });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      offer({ _tag: "phase", phase: "load" });
    }
  });
  return log;
});

/** @internal */
export const watchPageLog = watchPage;
