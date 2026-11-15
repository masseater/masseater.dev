import type { CredentialState } from "@masseater.dev/portal-protocol";
import type { ReactNode } from "react";

import { Row } from "#/shared/ui";

import { CredentialLine } from "./credential-line";

const STATUS: Readonly<Record<CredentialState["status"], string>> = {
  stored: "あり",
  missing: "なし",
};

export const CredentialRow = ({ state }: Readonly<{ state: CredentialState }>): ReactNode => (
  <Row lead={STATUS[state.status]}>
    <CredentialLine state={state} />
  </Row>
);
