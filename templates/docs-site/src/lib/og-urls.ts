/** Root-relative path for a site-hosted OG image. */
export function ogImagePath(image: string | undefined, fallback = '/favicon.svg'): string {
	if (!image) return fallback;
	if (image.startsWith('http')) {
		try {
			return new URL(image).pathname;
		} catch {
			return fallback;
		}
	}
	return image.startsWith('/') ? image : `/${image}`;
}

/** Absolute HTTPS URL — required by X/Twitter; WhatsApp also accepts it. */
export function absoluteOgAssetUrl(image: string | undefined, siteUrl: string, fallback = '/favicon.svg'): string {
	return new URL(ogImagePath(image, fallback), siteUrl).toString();
}

export function absolutePageUrl(pathname: string, siteUrl: string): string {
	return new URL(pathname, siteUrl).toString();
}
