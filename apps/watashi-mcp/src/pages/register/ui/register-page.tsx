import { PasskeyScreen } from "@masseater.dev/owner-auth/ui";
import type { ReactNode } from "react";

import { SITE_NAME } from "#/shared/config/index.ts";

export const RegisterPage = (): ReactNode => (
  <PasskeyScreen
    kind="register"
    title={SITE_NAME}
    label="パスキーを登録"
    done="登録しました"
    failed="登録できませんでした"
  />
);
