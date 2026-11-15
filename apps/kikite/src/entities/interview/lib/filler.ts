import { String as Str } from "effect";

const FILLER =
  /えーっと|えっと|えーと|えー|あのー|あの|うーん|うん|んー|なんだろう|なんだろ|そうですね|まあ|[、。,.!?！？…・〜ー\s]/gu;

const isFiller = (text: string): boolean => Str.isEmpty(Str.replaceAll(FILLER, "")(text));

export { isFiller };
