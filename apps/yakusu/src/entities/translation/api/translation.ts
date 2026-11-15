import {
  experimental_streamedQuery as streamedQuery,
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { Option, String, pipe } from "effect";

import { usePreparation } from "#/entities/engine/@x/translation";
import type { Direction } from "#/entities/language/@x/translation";
import { resolveDirection, useSelection } from "#/entities/language/@x/translation";
import { useDraft, useSettledDraft } from "#/entities/translation/model/draft";
import { formFor, useFormChoice } from "#/entities/translation/model/form";
import type { Output } from "#/entities/translation/model/output";
import { outputOf } from "#/entities/translation/model/output";
import { useEngine } from "#/shared/api";

const appendDelta = (translation: string, delta: string): string => `${translation}${delta}`;

export const useDirection = (): Direction => {
  const { source, target } = useSelection();
  return resolveDirection({ text: useSettledDraft(), source, target });
};

export const useTranslation = (): Output => {
  const engine = useEngine();
  const text = useSettledDraft();
  const direction = useDirection();
  const ready = usePreparation().preparation.status === "ready";
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
      enabled: ready && pipe(text, String.trim, String.isNonEmpty),
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
