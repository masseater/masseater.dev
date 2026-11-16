import { Effect } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient } from "effect/http";

import {
  CORRECTION_PATH,
  Correction,
  CorrectionRequest,
  RESEARCH_PATH,
  Research,
  ResearchAsk,
} from "#/shared/api/protocol.ts";
import type {
  CorrectionBody,
  HeardText,
  InterviewLead,
  ResearchAskBody,
} from "#/shared/api/protocol.ts";

import { InterviewerFailed, send } from "./interviewer.ts";

const failed = (cause: unknown): InterviewerFailed =>
  InterviewerFailed.make({ message: String(cause) });

/** @internal */
export const requestResearch = (
  body: ResearchAskBody,
): Effect.Effect<readonly InterviewLead[], InterviewerFailed, HttpClient.HttpClient> =>
  HttpClientRequest.post(RESEARCH_PATH).pipe(
    HttpClientRequest.schemaBodyJson(ResearchAsk)(body),
    Effect.flatMap(send),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Research)),
    Effect.mapBoth({ onSuccess: ({ leads }) => leads, onFailure: failed }),
  );

/** @internal */
export const requestCorrection = (
  body: CorrectionBody,
): Effect.Effect<readonly HeardText[], InterviewerFailed, HttpClient.HttpClient> =>
  HttpClientRequest.post(CORRECTION_PATH).pipe(
    HttpClientRequest.schemaBodyJson(CorrectionRequest)(body),
    Effect.flatMap(send),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Correction)),
    Effect.mapBoth({ onSuccess: ({ lines }) => lines, onFailure: failed }),
  );
