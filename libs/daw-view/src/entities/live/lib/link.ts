export interface Link {
  readonly send: (message: unknown) => void;
  readonly listen: (heard: (data: unknown) => void) => void;
}
