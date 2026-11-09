import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { LANGUAGES } from "#/entities/language";
import type { Side } from "#/entities/language";
import { matching, useQueryText } from "#/features/choose-language/model/search";

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
