export interface OgConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export interface DocsJsonWithOg {
  name?: string;
  og?: OgConfig;
}

const OG_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

export function validateOgConfig(config: DocsJsonWithOg): string[] {
  const errors: string[] = [];
  const og = config.og;
  if (!og) return errors;

  if (og.image) {
    const lower = og.image.toLowerCase();
    if (!OG_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      errors.push("og.image: should be a .png, .jpg, .jpeg, or .webp file");
    }
  }

  if (og.description && og.description.length > 160) {
    errors.push("og.description: should be ≤160 characters for optimal social media display");
  }

  return errors;
}
