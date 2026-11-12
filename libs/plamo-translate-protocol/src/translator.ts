import type { TranslateRequestValue, TranslateResultValue } from "./request.ts";

interface TranslatorRpc extends Rpc.WorkerEntrypointBranded {
  translate: (input: TranslateRequestValue) => Promise<TranslateResultValue>;
}

export type { TranslatorRpc };
