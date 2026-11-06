import { Effect } from "effect";
import { GM } from "vite-plugin-monkey/dist/client";

import { relayBody, relayResponse, relayUrl } from "./request.ts";
import type { RelayResponse, ScrapRequest } from "./request.ts";

const fire = (request: ScrapRequest): Effect.Effect<RelayResponse> =>
  relayBody(request).pipe(
    Effect.mapError(() => "依頼の内容を JSON にできませんでした"),
    Effect.flatMap((data) =>
      Effect.tryPromise({
        try: () =>
          GM.xmlHttpRequest({
            method: "POST",
            url: relayUrl,
            headers: { "content-type": "application/json" },
            data,
          }),
        catch: () => "ネットワークエラーで送れませんでした",
      }),
    ),
    Effect.match({
      onFailure: (reason): RelayResponse => ({ status: "failed", reason }),
      onSuccess: (response) =>
        relayResponse({
          status: response.status,
          finalUrl: response.finalUrl,
          text: response.responseText,
        }),
    }),
  );

export { fire };
