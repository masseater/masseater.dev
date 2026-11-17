export type FailWith<Failure> = (message: string) => (cause: unknown) => Failure;
