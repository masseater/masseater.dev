import { createFileRoute } from "@tanstack/react-router";

import { DemoPage } from "#/pages/demo/index.ts";

export const Route = createFileRoute("/")({ component: DemoPage });
