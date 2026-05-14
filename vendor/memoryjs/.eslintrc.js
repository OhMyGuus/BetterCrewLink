module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module'
  },
  extends: 'airbnb-base',
  'rules': {
    'no-console': 0,
    'global-require': 0,
    'import/no-unresolved': 0,
    'no-param-reassign': 0,
    'no-shadow': 0,
    'import/extensions': 0,
    'import/newline-after-import': 0,
    'no-multi-assign': 0,
    'linebreak-style': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    'consistent-return': 0,
  }
}