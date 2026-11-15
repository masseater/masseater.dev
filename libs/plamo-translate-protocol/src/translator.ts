import type { TranslateRequestValue, TranslateResultValue } from "./request.ts";

export interface TranslatorRpc extends Rpc.WorkerEntrypointBranded {
  translate: (input: TranslateRequestValue) => Promise<TranslateResultValue>;
}
