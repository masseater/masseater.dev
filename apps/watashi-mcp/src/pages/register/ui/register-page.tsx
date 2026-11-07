import { registerPasskey } from "@masseater.dev/owner-auth";
import { ActionPanel } from "@masseater.dev/owner-auth/ui";
import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { SITE_NAME } from "#/shared/config";

const RegisterPage = (): ReactNode => (
  <ActionPanel
    button={Button}
    title={SITE_NAME}
    label="パスキーを登録"
    done="登録しました"
    failed="登録できませんでした"
    action={registerPasskey}
  />
);

export { RegisterPage };
