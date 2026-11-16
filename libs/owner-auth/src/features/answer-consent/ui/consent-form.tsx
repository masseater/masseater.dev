import { Option } from "effect";
import type { ReactNode } from "react";

import type { ConsentSearchParams } from "#/features/answer-consent/model/consent.ts";
import type { ButtonComponent } from "#/shared/ui/button-component.ts";

import { ConsentPrompt } from "./consent-prompt.tsx";

export const ConsentForm = ({
  button,
  scope,
  search,
}: Readonly<{
  button: ButtonComponent;
  scope: string;
  search: ConsentSearchParams;
}>): ReactNode =>
  Option.match(Option.fromUndefinedOr(search.client_id), {
    onNone: () => false,
    onSome: (clientId) => (
      <ConsentPrompt
        button={button}
        scope={scope}
        clientId={clientId}
        redirectUri={search.redirect_uri}
        requestedScope={search.scope}
      />
    ),
  });
