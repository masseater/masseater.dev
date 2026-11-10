import { useMutation, useQuery } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { ButtonComponent } from "./button-component";
import { answerConsent, clientNameQuery, consentView } from "./consent";
import { ConsentActions } from "./consent-actions";
import { ConsentDetails } from "./consent-details";

const ConsentPrompt = ({
  button,
  scope,
  clientId,
  redirectUri,
  requestedScope,
}: Readonly<{
  button: ButtonComponent;
  scope: string;
  clientId: string;
  redirectUri: string | undefined;
  requestedScope: string | undefined;
}>): ReactNode => {
  const client = useQuery(clientNameQuery(clientId));
  const { name, details, allow } = consentView({
    clientId,
    clientName: Option.fromUndefinedOr(client.data),
    redirectUri: Option.fromUndefinedOr(redirectUri),
    requestedScope: Option.fromUndefinedOr(requestedScope),
  });
  const { mutate, status } = useMutation({ mutationFn: answerConsent });
  const accept = useCallback(() => {
    mutate(true);
  }, [mutate]);
  const deny = useCallback(() => {
    mutate(false);
  }, [mutate]);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold break-all">{name}</h1>
      <ConsentDetails details={details} />
      <ConsentActions
        button={button}
        scope={scope}
        allow={allow}
        status={status}
        onAllow={accept}
        onDeny={deny}
      />
    </section>
  );
};

export { ConsentPrompt };
