import { Effect } from "effect";
import { GM } from "vite-plugin-monkey/dist/client";

import { fireBody, fireHeaders, fireResponse } from "./request.ts";
import type { FireResponse, FireSettings, ScrapRequest } from "./request.ts";

const fire = (
  input: Readonly<{ settings: FireSettings; request: ScrapRequest }>,
): Effect.Effect<FireResponse> =>
  Effect.tryPromise({
    try: () =>
      GM.xmlHttpRequest({
        method: "POST",
        url: input.settings.fireUrl,
        headers: { ...fireHeaders(input.settings) },
        data: fireBody(input.request),
      }),
    catch: () => "ネットワークエラーで送れませんでした",
  }).pipe(
    Effect.match({
      onFailure: (reason): FireResponse => ({ status: "failed", reason }),
      onSuccess: (response) =>
        fireResponse({ status: response.status, text: response.responseText }),
    }),
  );

export { fire };
