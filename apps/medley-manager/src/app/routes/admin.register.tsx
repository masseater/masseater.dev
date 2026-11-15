import { createFileRoute } from "@tanstack/react-router";

import { RegisterPage } from "#/pages/admin-register/index.ts";

export const Route = createFileRoute("/admin/register")({ component: RegisterPage });
