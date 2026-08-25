// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const navConfigPath = fileURLToPath(new URL('./nav.config.json', import.meta.url));
const nav = JSON.parse(readFileSync(navConfigPath, 'utf-8'));

/** @type {import('@astrojs/starlight/types').StarlightUserConfig['sidebar']} */
const sidebar = nav.tabs.map((tab) => ({
	label: tab.label,
	items: tab.groups.map((group) => ({
		label: group.label,
		items: group.pages,
	})),
}));

// A project's docs.json can set colors.primary — when present, derive the
// full accent scale from that one color instead of the template's default indigo.
// !important is required here: this style tag and theme.css's own :root rule
// have identical specificity, and customCss loads after `head` in Starlight's
// output, so without !important theme.css's hardcoded accent silently wins.
const accentOverrideCss = nav.accentColor
	? `:root{--sl-color-accent:${nav.accentColor} !important;--sl-color-accent-high:color-mix(in oklch, var(--sl-color-accent) 70%, black) !important;--sl-color-accent-low:color-mix(in oklch, var(--sl-color-accent) 15%, white) !important;}
:root[data-theme='dark']{--sl-color-accent-high:color-mix(in oklch, var(--sl-color-accent) 60%, white) !important;--sl-color-accent-low:color-mix(in oklch, var(--sl-color-accent) 20%, black) !important;}`
	: '';

// A project's docs.json can also set its own page/nav/sidebar background —
// override all three together so the whole shell reads as one flat color,
// rather than just the page background changing on its own.
const backgroundOverrideCss = [
	nav.backgroundColor?.light
		? `:root{--sl-color-bg:${nav.backgroundColor.light};--sl-color-bg-nav:${nav.backgroundColor.light};--sl-color-bg-sidebar:${nav.backgroundColor.light};}`
		: '',
	nav.backgroundColor?.dark
		? `:root[data-theme='dark']{--sl-color-bg:${nav.backgroundColor.dark};--sl-color-bg-nav:${nav.backgroundColor.dark};--sl-color-bg-sidebar:${nav.backgroundColor.dark};}`
		: '',
].join('\n');

const firstPage = nav.tabs[0]?.groups[0]?.pages[0];

// https://astro.build/config
export default defineConfig({
	site: nav.siteUrl,
	redirects: firstPage ? { '/': `/${firstPage}` } : {},
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex],
	},
	integrations: [
		starlight({
			title: nav.name,
			sidebar,
			// A project's docs.json can set its own logo/favicon; when it doesn't,
			// fall back to Huell's own default mark rather than showing no logo at all.
			// A project's own logo replaces the site-title text (it's usually a full
			// wordmark lockup already, like VortexDB's) — the icon-only default doesn't,
			// since it has no text of its own and needs the title for identification.
			logo: nav.logo
				? typeof nav.logo === 'string'
					? { src: nav.logo, replacesTitle: true }
					: { light: nav.logo.light, dark: nav.logo.dark, replacesTitle: true }
				: { light: './src/assets/branding/default-light.svg', dark: './src/assets/branding/default-dark.svg' },
			favicon: nav.favicon,
			components: {
				Header: './src/components/Header.astro',
				Head: './src/components/Head.astro',
				Sidebar: './src/components/Sidebar.astro',
			},
			customCss: ['./src/styles/theme.css'],
			head: [accentOverrideCss, backgroundOverrideCss]
				.filter(Boolean)
				.map((content) => ({ tag: 'style', content })),
		}),
	],
});
