import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
	{ ignores: ['out/**', 'dist/**', 'vendor/**', 'node_modules/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	react.configs.flat.recommended,
	prettierConfig,
	{
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'module',
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
		},
		settings: {
			react: { version: 'detect' },
		},
		plugins: {
			prettier,
		},
		rules: {
			'linebreak-style': ['error', 'unix'],
			'prettier/prettier': 'error',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
		},
	}
);
