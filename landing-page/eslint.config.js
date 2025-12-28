import globals from 'eslint/conf/globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReactHooks from 'eslint-plugin-react-hooks'

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': pluginReactHooks },
    rules: pluginReactHooks.configs.recommended.rules,
  },
]
