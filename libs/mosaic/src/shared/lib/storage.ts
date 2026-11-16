export const FILES_DIR = "files";

export interface VariantRef {
  readonly slug: string;
  readonly variant: number;
  readonly version: string;
}

export const slugPath = (slug: string): string => `${FILES_DIR}/${slug}`;

export const manifestPath = (slug: string): string => `${slugPath(slug)}/manifest.json`;

export const versionPath = ({ slug, variant, version }: VariantRef): string =>
  `${slugPath(slug)}/${variant}/${version}`;
