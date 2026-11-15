export type Answering = Readonly<{
  typed: (text: string) => void;
  typing: (text: string) => void;
}>;
