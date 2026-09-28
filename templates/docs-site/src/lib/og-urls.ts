/** Root-relative OG image path so *.docs.* and custom-domain aliases resolve the same file. */
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
