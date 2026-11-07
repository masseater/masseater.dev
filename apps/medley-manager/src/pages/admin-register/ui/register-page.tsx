import { registerPasskey } from "@masseater.dev/owner-auth";
import { ActionPanel } from "@masseater.dev/owner-auth/ui";
import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

const RegisterPage = (): ReactNode => (
  <div className="max-w-sm">
    <ActionPanel
      button={Button}
      title="管理者の登録"
      label="パスキーを登録"
      done="登録しました"
      failed="登録できませんでした"
      action={registerPasskey}
    />
  </div>
);

export { RegisterPage };
