import {
  experimental_streamedQuery as streamedQuery,
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { Option, String, pipe } from "effect";

import { useSelection } from "#/entities/language";
import type { Direction } from "#/features/translate-text/model/direction";
import { resolveDirection } from "#/features/translate-text/model/direction";
import { useDraft, useSettledDraft } from "#/features/translate-text/model/draft";
import { formFor, useFormChoice } from "#/features/translate-text/model/form";
import type { Output } from "#/features/translate-text/model/output";
import { outputOf } from "#/features/translate-text/model/output";
import { useEngine } from "#/shared/api";

const appendDelta = (translation: string, delta: string): string => `${translation}${delta}`;

const useDirection = (): Direction => {
  const { source, target } = useSelection();
  return resolveDirection({ text: useSettledDraft(), source, target });
};

const useTranslation = (): Output => {
  const engine = useEngine();
  const text = useSettledDraft();
  const direction = useDirection();
  const request = {
    text,
    source: direction.source,
    target: direction.target,
    form: formFor({ target: direction.target, choice: useFormChoice() }),
  };
  const query = useQuery(
    queryOptions({
      queryKey: ["translation", request],
      queryFn: streamedQuery({
        streamFn: () => engine.translate(request),
        reducer: appendDelta,
        initialValue: "",
      }),
      enabled: pipe(text, String.trim, String.isNonEmpty),
      staleTime: Number.POSITIVE_INFINITY,
      retry: false,
      placeholderData: keepPreviousData,
    }),
  );
  return outputOf({
    draft: useDraft(),
    query: {
      data: Option.fromNullishOr(query.data),
      failure: Option.map(Option.fromNullishOr(query.error), ({ message }) => message),
      isPlaceholderData: query.isPlaceholderData,
    },
  });
};

export { useDirection, useTranslation };
