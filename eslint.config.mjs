import globals from 'globals'
import js from '@eslint/js'


export default [
	js.configs.recommended,
	{
		ignores: ['node_modules/*'],
		languageOptions: {
			globals: {
				...globals.commonjs,
				...globals.node,
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly',
			},

			ecmaVersion: 2020,
			sourceType: 'module',
		},

		rules: {
			indent: ['error', 'tab'],
			'linebreak-style': ['error', 'unix'],
			quotes: ['error', 'single'],
			semi: ['error', 'never'],
			'no-console': 'off',
		},
	}, {
		files: ['**/*.mjs'],
	}]