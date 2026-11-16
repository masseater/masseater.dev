import { createMiddleware } from "@tanstack/react-start";

const passThrough = <Result>({
  next,
}: Readonly<{ next: () => PromiseLike<Result> | Result }>): Promise<Result> =>
  Promise.resolve(next());

export const requestSpan = createMiddleware().server(passThrough);
export const serverFnSpan = createMiddleware({ type: "function" }).server(passThrough);

export const traceRequest = passThrough;
export const traceServerFn = passThrough;
