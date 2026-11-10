import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { LANGUAGES } from "#/pages/translator/model/languages.ts";
import { matching, useQueryText } from "#/pages/translator/model/search.ts";
import type { Side } from "#/pages/translator/model/selection.ts";

import { DetectChoice } from "./detect-choice.tsx";
import { LanguageChoice } from "./language-choice.tsx";

const PickerChoices = ({ side }: Readonly<{ side: Side }>): ReactNode => (
  <div className="columns-2 gap-x-2 p-3 sm:columns-3 lg:columns-5">
    <DetectChoice side={side} />
    {pipe(
      matching({ languages: LANGUAGES, query: useQueryText() }),
      Array.map((language) => (
        <LanguageChoice key={language.code} language={language} side={side} />
      )),
    )}
  </div>
);

export { PickerChoices };
