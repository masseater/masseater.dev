import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { watashiQueries } from "#/entities/watashi";
import type { ProjectValue } from "#/entities/watashi";

const projects = watashiQueries["memo-projects"].get;

export const loadProjects = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(projects.queryOptions());

export const useProjects = (): readonly ProjectValue[] =>
  useSuspenseQuery(projects.queryOptions()).data.projects;
