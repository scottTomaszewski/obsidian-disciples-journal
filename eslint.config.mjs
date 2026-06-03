import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
	{
		// obsidianmd only wires up JSON parsing for package.json; other JSON
		// files would be parsed as JS and error. Build artifacts/configs too.
		ignores: [
			"main.js",
			"node_modules/**",
			"**/*.mjs",
			"manifest.json",
			"versions.json",
			"data.json",
			"tsconfig.json",
			"devbox.json",
			"devbox.lock",
			".devbox/**",
			"package-lock.json",
		],
	},
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// Obsidian/CodeMirror callback signatures often include unused args.
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			// Disabled upstream as "not working as intended" (v0.3.0); it also
			// lower-cases proper nouns (Bible, ESV, Christ). Sentence case is
			// applied manually instead.
			"obsidianmd/ui/sentence-case": "off",
		},
	},
	{
		// Tests legitimately use Node builtins (node:test / node:assert), and the
		// node:test runner's top-level test() calls intentionally return unawaited
		// promises. Both are flagged by the plugin-oriented recommended set.
		files: ["test/**/*.ts"],
		rules: {
			"import/no-nodejs-modules": "off",
			"@typescript-eslint/no-floating-promises": "off",
		},
	},
	{
		// obsidianmd's recommended set applies several type-aware rules globally
		// (no file filter). They require TS parser services and crash on the JSON
		// files. They are only meaningful for source, so disable them for JSON.
		files: ["**/*.json"],
		rules: {
			"obsidianmd/no-plugin-as-component": "off",
			"obsidianmd/no-view-references-in-plugin": "off",
			"obsidianmd/prefer-file-manager-trash-file": "off",
			"obsidianmd/prefer-instanceof": "off",
			"obsidianmd/no-unsupported-api": "off",
		},
	},
]);
