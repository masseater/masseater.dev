import { layer } from "@effect/vitest";

import {
  findsATypesConditionNestedUnderAnotherCo,
  hasNothingToOfferWithoutDependenciesOrWi,
  leavesWorkspaceDependenciesToTheReposito,
  letsTheTypesFieldDecideWhenTheExportMapN,
  letsTheTypesFieldNameTheRootWhenTheExpor,
  pointsARuntimeOnlyMainEntryAtTheDeclarat,
  readsAnExportMapSpelledAsOnePathAsTheRoo,
  readsConditionsWrittenWithoutASubpathAsT,
  readsDevelopmentAndPeerDependenciesTheSa,
  readsEveryPublishedSubpathAndLeavesWildc,
  readsTheRootTypesConditionOfAnExportMap,
  skipsPackagesThatShipNoDeclarationsOrAre,
  sortsEntriesByPackageName,
} from "./dependencies-cases.ts";
import { fixtureLayer } from "./repository.test.support.ts";

layer(fixtureLayer)("dependencyEntries export maps", (it) => {
  it.effect(
    "reads the root types condition of an export map",
    () => readsTheRootTypesConditionOfAnExportMap,
  );
  it.effect(
    "reads an export map spelled as one path as the root",
    () => readsAnExportMapSpelledAsOnePathAsTheRoo,
  );
  it.effect(
    "reads conditions written without a subpath as the root",
    () => readsConditionsWrittenWithoutASubpathAsT,
  );
  it.effect(
    "reads every published subpath and leaves wildcard subpaths out",
    () => readsEveryPublishedSubpathAndLeavesWildc,
  );
  it.effect(
    "lets the types field name the root when the export map names only subpaths",
    () => letsTheTypesFieldNameTheRootWhenTheExpor,
  );
  it.effect(
    "lets the types field decide when the export map names no declarations",
    () => letsTheTypesFieldDecideWhenTheExportMapN,
  );
});

layer(fixtureLayer)("dependencyEntries manifests", (it) => {
  it.effect(
    "finds a types condition nested under another condition",
    () => findsATypesConditionNestedUnderAnotherCo,
  );
  it.effect(
    "points a runtime-only main entry at the declarations beside it",
    () => pointsARuntimeOnlyMainEntryAtTheDeclarat,
  );
  it.effect(
    "reads development and peer dependencies the same way",
    () => readsDevelopmentAndPeerDependenciesTheSa,
  );
  it.effect(
    "leaves workspace dependencies to the repository catalog",
    () => leavesWorkspaceDependenciesToTheReposito,
  );
  it.effect(
    "skips packages that ship no declarations or are missing",
    () => skipsPackagesThatShipNoDeclarationsOrAre,
  );
  it.effect("sorts entries by package name", () => sortsEntriesByPackageName);
  it.effect(
    "has nothing to offer without dependencies or a manifest",
    () => hasNothingToOfferWithoutDependenciesOrWi,
  );
});
