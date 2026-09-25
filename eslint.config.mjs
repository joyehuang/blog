// @ts-check

import eslint from '@eslint/js'
import eslintPluginAstro from 'eslint-plugin-astro'
import tseslint from 'typescript-eslint'

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  // Build-time flags injected by astro.config.ts (vite.define); see docs/jojo.md
  {
    languageOptions: { globals: { __JOJO__: 'readonly', __JOJO_REVIEW__: 'readonly' } }
  },
  // Ignore files
  {
    ignores: ['public/scripts/*', 'scripts/*', '.astro/', 'src/env.d.ts']
  }
]
