import { requestSpan, serverFnSpan } from "@r_masseater/workers-tracing/tanstack-start";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { securedResult } from "security-headers/response";

const securityHeaders = createMiddleware().server(({ next }) => securedResult(next));

export const securedStartInstance = createStart(() => ({
  requestMiddleware: [requestSpan, securityHeaders],
  functionMiddleware: [serverFnSpan],
}));
