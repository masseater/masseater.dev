import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { COPY } from "#/pages/extract/model/copy";

import { ApiKeyField } from "./api-key-field";
import { PicturePicker } from "./picture-picker";
import { PicturePreview } from "./picture-preview";
import { RunPanel } from "./run-panel";
import { WayField } from "./way-field";

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
