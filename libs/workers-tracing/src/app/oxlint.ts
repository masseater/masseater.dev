export interface RestrictedSyntax {
  readonly selector: string;
  readonly message: string;
}

export const restrictedSyntax: readonly RestrictedSyntax[] = [
  {
    selector:
      'CallExpression[callee.property.name="run"][callee.object.property.name="AI"]:not(CallExpression[callee.name="runWorkersAi"] *)',
    message:
      "Call Workers AI inside runWorkersAi from @r_masseater/workers-tracing/workers-ai, so an out-of-capacity error is retried and a cut-off answer is logged.",
  },
];
