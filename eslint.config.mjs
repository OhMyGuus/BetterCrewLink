import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
	{ ignores: ['out/**', 'dist/**', 'vendor/**', 'node_modules/**'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	react.configs.flat.recommended,
	reactHooks.configs.flat['recommended-latest'],
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
			'prettier/prettier': 'error',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
			'@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/immutability': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			// React Compiler rules: this build does not run the compiler, so its
			// stricter requirements do not apply here.
			'react-hooks/set-state-in-effect': 'off',
			'react-hooks/set-state-in-render': 'off',
			'react-hooks/preserve-manual-memoization': 'off',
			'react-hooks/static-components': 'off',
			'react-hooks/use-memo': 'off',
			'react-hooks/void-use-memo': 'off',
			'react-hooks/refs': 'off',
			'react-hooks/purity': 'off',
			'react-hooks/incompatible-library': 'off',
		},
	}
);
