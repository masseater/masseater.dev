import type { ReactNode } from "react";

import { useCredentials } from "#/pages/credentials/api/credentials-query";

import { CredentialSection } from "./credential-section";

const CredentialsPage = (): ReactNode => {
  const states = useCredentials();
  return (
    <div className="flex flex-col gap-12">
      <CredentialSection kind="key" states={states} />
      <CredentialSection kind="login" states={states} />
    </div>
  );
};

export { CredentialsPage };
