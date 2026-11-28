import { PasskeyScreen } from "@masseater.dev/owner-auth/ui";
import type { ReactNode } from "react";

export const RegisterPage = (): ReactNode => (
  <div className="max-w-sm">
    <PasskeyScreen
      kind="register"
      title="管理者の登録"
      label="パスキーを登録"
      done="登録しました"
      failed="登録できませんでした"
    />
  </div>
);
