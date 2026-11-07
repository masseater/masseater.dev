import type { Source } from "@masseater.dev/aredoko-protocol";
import {
  queryOptions,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { Array, Option, pipe } from "effect";

import { NO_IMPORT, lastImportOf } from "#/features/library/model/last-import";
import type { LastImport } from "#/features/library/model/last-import";
import {
  ASSETS_KEY,
  LIBRARY_POLL,
  PACKAGES_KEY,
  SOURCES_KEY,
  STATUS_KEY,
  addSource,
  getLibrary,
  importFiles,
  listSources,
  removeSource,
} from "#/shared/api";
import type { LibraryInfo } from "#/shared/api";

const LIBRARY_KEY = ["library"];
const IMPORT_KEY = ["import"];

const useSources = (): UseQueryResult<readonly (typeof Source.Type)[]> =>
  useQuery(
    queryOptions({
      queryKey: SOURCES_KEY,
      queryFn: listSources,
      ...LIBRARY_POLL,
    }),
  );

const useRefreshLibrary = (): (() => Promise<unknown>) => {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: SOURCES_KEY }),
      client.invalidateQueries({ queryKey: PACKAGES_KEY }),
      client.invalidateQueries({ queryKey: ASSETS_KEY }),
      client.invalidateQueries({ queryKey: STATUS_KEY }),
    ]);
};

const addFolder = (path: string): Promise<typeof Source.Type> =>
  addSource({ path, kind: "folder" });

const useAddFolder = (): UseMutationResult<typeof Source.Type, Error, string> => {
  const refresh = useRefreshLibrary();
  return useMutation({ mutationFn: addFolder, onSuccess: refresh });
};

const useRemoveSource = (): UseMutationResult<void, Error, number> => {
  const refresh = useRefreshLibrary();
  return useMutation({ mutationFn: removeSource, onSuccess: refresh });
};

type KnownFolder = "assetStore" | "blm";

const useLibrary = (): UseQueryResult<LibraryInfo> =>
  useQuery(queryOptions({ queryKey: LIBRARY_KEY, queryFn: getLibrary, retry: false }));

interface NamedFolder {
  readonly name: string;
  readonly removable: boolean;
}

const LIBRARY: NamedFolder = { name: "aredoko", removable: false };

const KNOWN_FOLDERS: Readonly<Record<KnownFolder, NamedFolder>> = {
  assetStore: { name: "Unity Asset Store", removable: true },
  blm: { name: "BOOTH Library Manager", removable: true },
};

const KNOWN: readonly KnownFolder[] = ["assetStore", "blm"];

const NOT_NAMED = (): Option.Option<NamedFolder> => Option.none();

const useFolderName = (): ((path: string) => Option.Option<NamedFolder>) => {
  const library = useLibrary();
  if (!library.isSuccess) {
    return NOT_NAMED;
  }
  const { data } = library;
  return (path) => {
    if (path === data.path) {
      return Option.some(LIBRARY);
    }
    return pipe(
      KNOWN,
      Array.findFirst((known) => Option.contains(data[known], path)),
      Option.map((known) => KNOWN_FOLDERS[known]),
    );
  };
};

const useKnownFolder = (known: KnownFolder): Option.Option<string> => {
  const library = useLibrary();
  const sources = useSources();
  if (!library.isSuccess || !sources.isSuccess) {
    return Option.none();
  }
  const registered = sources.data;
  return pipe(
    library.data[known],
    Option.filter(
      (folder) =>
        !pipe(
          registered,
          Array.some(({ path }) => path === folder),
        ),
    ),
  );
};

const useImportFiles = (): UseMutationResult<number, Error, readonly string[]> => {
  const refresh = useRefreshLibrary();
  return useMutation({ mutationKey: IMPORT_KEY, mutationFn: importFiles, onSuccess: refresh });
};

const useLastImport = (): LastImport =>
  pipe(
    useMutationState({
      filters: { mutationKey: IMPORT_KEY },
      select: ({ state: { status, data, error } }) => lastImportOf({ status, data, error }),
    }),
    Array.last,
    Option.getOrElse(() => NO_IMPORT),
  );

export type { KnownFolder, NamedFolder };
export {
  useAddFolder,
  useFolderName,
  useKnownFolder,
  useImportFiles,
  useLastImport,
  useRefreshLibrary,
  useRemoveSource,
  useSources,
};
