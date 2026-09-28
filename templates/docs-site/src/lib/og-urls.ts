/** Absolute OG image URL for the host that served the page (custom domain or *.docs.*). */
export function absoluteOgImage(image: string | undefined, origin: string, fallback = '/favicon.svg'): string {
	if (!image) return new URL(fallback, origin).toString();
	if (image.startsWith('http')) {
		return new URL(new URL(image).pathname, origin).toString();
	}
	return new URL(image, origin).toString();
}
