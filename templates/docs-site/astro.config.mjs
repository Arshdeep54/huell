// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const navConfigPath = fileURLToPath(new URL('./nav.config.json', import.meta.url));
const nav = JSON.parse(readFileSync(navConfigPath, 'utf-8'));

/** @type {import('@astrojs/starlight/types').StarlightUserConfig['sidebar']} */
const sidebar = nav.tabs.map((tab) => ({
	label: tab.label,
	items: tab.groups.map((group) => ({
		label: group.label,
		items: group.pages.map((page) => `${tab.slug}/${page}`),
	})),
}));

// https://astro.build/config
export default defineConfig({
	site: nav.siteUrl,
	integrations: [
		starlight({
			title: nav.name,
			sidebar,
			components: {
				Header: './src/components/Header.astro',
			},
			customCss: ['./src/styles/theme.css'],
		}),
	],
});
