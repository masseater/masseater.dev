import { Option } from "effect";
import type { ReactNode } from "react";

import type { ButtonComponent } from "./button-component";
import type { ConsentSearchParams } from "./consent";
import { ConsentPrompt } from "./consent-prompt";

const ConsentForm = ({
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

export { ConsentForm };
