import { noTaigendome } from "./no-taigendome.ts";
import { yomiyasu } from "./yomiyasu.ts";

const preset = {
  rules: { yomiyasu, "no-taigendome": noTaigendome },
  rulesConfig: { yomiyasu: true, "no-taigendome": true },
};

export default preset;
