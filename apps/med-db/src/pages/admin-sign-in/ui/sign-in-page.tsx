import { PasskeyScreen } from "@masseater.dev/owner-auth/ui";
import type { ReactNode } from "react";

export const SignInPage = (): ReactNode => (
  <div className="max-w-sm">
    <PasskeyScreen
      kind="sign-in"
      title="管理者ログイン"
      label="パスキーでログイン"
      done="ログインしました"
      failed="ログインできませんでした"
    />
  </div>
);
