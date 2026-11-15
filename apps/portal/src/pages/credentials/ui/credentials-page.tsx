import type { ReactNode } from "react";

import { useCredentials } from "#/pages/credentials/api/credentials-query.ts";

import { CredentialSection } from "./credential-section";

export const CredentialsPage = (): ReactNode => {
  const states = useCredentials();
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <CredentialSection kind="key" states={states} />
      <CredentialSection kind="login" states={states} />
    </div>
  );
};
