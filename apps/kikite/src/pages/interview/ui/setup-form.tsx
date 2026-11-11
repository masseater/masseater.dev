import type { SubmitEvent, ReactNode } from "react";
import { useCallback } from "react";

import { useStart } from "#/pages/interview/model/hooks";

import { GoalField } from "./goal-field.tsx";
import { SettingsFields } from "./settings-fields.tsx";
import { StartButton } from "./start-button.tsx";
import { ThemeField } from "./theme-field.tsx";

const TITLE = "kikite";

const SetupForm = (): ReactNode => {
  const start = useStart();
  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      start();
    },
    [start],
  );
  return (
    <form className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10" onSubmit={onSubmit}>
      <h1 className="text-2xl font-semibold">{TITLE}</h1>
      <ThemeField />
      <GoalField />
      <SettingsFields />
      <StartButton />
    </form>
  );
};

export { SetupForm };
