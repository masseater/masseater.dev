import { BrowserHost } from "@effect/ui/html";
import { EffectIsland } from "@masseater.dev/effect-ui";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { ConsentSearchParams } from "#/features/answer-consent/model/consent.ts";

import { ConsentPrompt } from "./consent-prompt.ts";

const ConsentScreen = ({
  scope,
  clientId,
  redirectUri,
  requestedScope,
}: Readonly<{
  scope: string;
  clientId: string;
  redirectUri: string | undefined;
  requestedScope: string | undefined;
}>): ReactNode => {
  const mount = useCallback(
    (container: HTMLElement) =>
      BrowserHost.mount(ConsentPrompt, { scope, clientId, redirectUri, requestedScope }, container),
    [scope, clientId, redirectUri, requestedScope],
  );
  return <EffectIsland mount={mount} />;
};

export const ConsentForm = ({
  scope,
  search,
}: Readonly<{ scope: string; search: ConsentSearchParams }>): ReactNode =>
  Option.match(Option.fromUndefinedOr(search.client_id), {
    onNone: () => false,
    onSome: (clientId) => (
      <ConsentScreen
        scope={scope}
        clientId={clientId}
        redirectUri={search.redirect_uri}
        requestedScope={search.scope}
      />
    ),
  });
