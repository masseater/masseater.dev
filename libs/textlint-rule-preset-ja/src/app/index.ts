import { noTaigendome } from "#/features/check-taigendome/index.ts";
import { yomiyasu } from "#/features/check-yomiyasu/index.ts";

const preset = {
  rules: { yomiyasu, "no-taigendome": noTaigendome },
  rulesConfig: { yomiyasu: true, "no-taigendome": true },
};

export default preset;
