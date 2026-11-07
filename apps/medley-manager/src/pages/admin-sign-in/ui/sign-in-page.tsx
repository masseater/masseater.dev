import { signInWithPasskey } from "@masseater.dev/owner-auth";
import { ActionPanel } from "@masseater.dev/owner-auth/ui";
import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

const SignInPage = (): ReactNode => (
  <div className="max-w-sm">
    <ActionPanel
      button={Button}
      title="管理者ログイン"
      label="パスキーでログイン"
      done="ログインしました"
      failed="ログインできませんでした"
      action={signInWithPasskey}
    />
  </div>
);

export { SignInPage };
