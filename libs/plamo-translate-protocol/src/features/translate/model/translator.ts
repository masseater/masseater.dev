import type { TranslateRequestValue, TranslateResultValue } from "#/entities/translation/index.ts";

export interface TranslatorRpc extends Rpc.WorkerEntrypointBranded {
  translate: (input: TranslateRequestValue) => Promise<TranslateResultValue>;
}
