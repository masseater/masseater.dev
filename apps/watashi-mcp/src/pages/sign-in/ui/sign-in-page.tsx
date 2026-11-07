import { signInWithPasskey } from "@masseater.dev/owner-auth";
import { ActionPanel } from "@masseater.dev/owner-auth/ui";
import { Button } from "@masseater.dev/ui/button";
import type { ReactNode } from "react";

import { SITE_NAME } from "#/shared/config";

const SignInPage = (): ReactNode => (
  <ActionPanel
    button={Button}
    title={SITE_NAME}
    label="パスキーでログイン"
    done="ログインしました"
    failed="ログインできませんでした"
    action={signInWithPasskey}
  />
);

export { SignInPage };
