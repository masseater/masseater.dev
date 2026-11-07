import { createFileRoute } from "@tanstack/react-router";

import { RegisterPage } from "#/pages/admin-register";

const Route = createFileRoute("/admin/register")({ component: RegisterPage });

export { Route };
