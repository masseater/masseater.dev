import { PasskeyScreen } from "@masseater.dev/owner-auth/ui";
import type { ReactNode } from "react";

import { SITE_NAME } from "#/shared/config/index.ts";

export const SignInPage = (): ReactNode => (
  <PasskeyScreen
    kind="sign-in"
    title={SITE_NAME}
    label="パスキーでログイン"
    done="ログインしました"
    failed="ログインできませんでした"
  />
);
