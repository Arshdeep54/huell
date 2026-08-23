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
const accentOverrideCss = nav.accentColor
	? `:root{--sl-color-accent:${nav.accentColor};--sl-color-accent-high:color-mix(in oklch, var(--sl-color-accent) 70%, black);--sl-color-accent-low:color-mix(in oklch, var(--sl-color-accent) 15%, white);}
:root[data-theme='dark']{--sl-color-accent-high:color-mix(in oklch, var(--sl-color-accent) 60%, white);--sl-color-accent-low:color-mix(in oklch, var(--sl-color-accent) 20%, black);}`
	: '';

// https://astro.build/config
export default defineConfig({
	site: nav.siteUrl,
	markdown: {
		remarkPlugins: [remarkMath],
		rehypePlugins: [rehypeKatex],
	},
	integrations: [
		starlight({
			title: nav.name,
			sidebar,
			components: {
				Header: './src/components/Header.astro',
				Head: './src/components/Head.astro',
			},
			customCss: ['./src/styles/theme.css'],
			head: accentOverrideCss
				? [{ tag: 'style', content: accentOverrideCss }]
				: [],
		}),
	],
});
