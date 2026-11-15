import { createFileRoute } from "@tanstack/react-router";

import { RegisterPage } from "#/pages/admin-register";

export const Route = createFileRoute("/admin/register")({ component: RegisterPage });
