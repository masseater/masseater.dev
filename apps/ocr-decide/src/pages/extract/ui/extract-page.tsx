import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { WayField } from "#/features/choose-way";
import { ApiKeyField } from "#/features/enter-api-key";
import { PicturePicker, PicturePreview } from "#/features/pick-picture";
import { RunPanel } from "#/features/run-extract";
import { COPY } from "#/shared/config";

const ExtractPage = (): ReactNode => (
  <main className="vt-match mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 md:px-8">
    <h1 className="text-2xl font-bold">{COPY.title}</h1>
    <PicturePicker />
    <PicturePreview />
    <ApiKeyField />
    <WayField />
    <RunPanel />
    <Link to="/measurements" className="text-sm underline underline-offset-4">
      {COPY.measurements}
    </Link>
    <Link to="/ocr-engines" className="text-sm underline underline-offset-4">
      {COPY.ocrEngines}
    </Link>
  </main>
);

export { ExtractPage };
