import type { CredentialState } from "@masseater.dev/portal-protocol";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { RowList, Section } from "#/shared/ui";

import { CredentialRow } from "./credential-row";

const TITLES: Readonly<Record<CredentialState["kind"], string>> = {
  key: "鍵",
  login: "ログイン",
};

const CredentialSection = ({
  kind,
  states,
}: Readonly<{ kind: CredentialState["kind"]; states: readonly CredentialState[] }>): ReactNode => (
  <Section title={TITLES[kind]}>
    <RowList label={TITLES[kind]}>
      {pipe(
        states,
        Arr.filter((state) => state.kind === kind),
        Arr.map((state) => <CredentialRow key={state.id} state={state} />),
      )}
    </RowList>
  </Section>
);

export { CredentialSection };
