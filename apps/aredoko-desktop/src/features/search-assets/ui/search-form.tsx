import { Button } from "@masseater.dev/ui/button";
import { Search } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import { useDraft, useSetDraft, useSubmitQuery } from "#/entities/asset/index.ts";
import { Input } from "#/shared/ui/input.tsx";

import { ClearSearchButton } from "./clear-search-button.tsx";

const PLACEHOLDER = "木の床、赤いドラム缶、剣";
const LABEL = "検索語";
const SUBMIT = "検索する";

export const SearchForm = (): ReactNode => {
  const draft = useDraft();
  const setDraft = useSetDraft();
  const submit = useSubmitQuery();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraft(event.target.value);
    },
    [setDraft],
  );
  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit(draft);
    },
    [submit, draft],
  );
  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <Input
        type="text"
        enterKeyHint="search"
        placeholder={PLACEHOLDER}
        aria-label={LABEL}
        value={draft}
        onChange={onChange}
      />
      <ClearSearchButton />
      <Button type="submit">
        <Search />
        {SUBMIT}
      </Button>
    </form>
  );
};
