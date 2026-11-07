import type { ReactNode } from "react";

import { signInWithPasskey } from "#/pages/sign-in/api/sign-in";
import { SITE_NAME } from "#/shared/config";
import { ActionPanel } from "#/shared/ui/action-panel";

const SignInPage = (): ReactNode => (
  <ActionPanel
    title={SITE_NAME}
    label="パスキーでログイン"
    done="ログインしました"
    failed="ログインできませんでした"
    action={signInWithPasskey}
  />
);

export { SignInPage };
