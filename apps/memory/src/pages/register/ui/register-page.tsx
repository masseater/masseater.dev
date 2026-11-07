import type { ReactNode } from "react";

import { registerPasskey } from "#/pages/register/api/register";
import { SITE_NAME } from "#/shared/config";
import { ActionPanel } from "#/shared/ui/action-panel";

const RegisterPage = (): ReactNode => (
  <ActionPanel
    title={SITE_NAME}
    label="パスキーを登録"
    done="登録しました"
    failed="登録できませんでした"
    action={registerPasskey}
  />
);

export { RegisterPage };
