import { createFileRoute } from "@tanstack/react-router";

import { SignInPage } from "#/pages/admin-sign-in/index.ts";

export const Route = createFileRoute("/admin/sign-in")({ component: SignInPage });
