module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@angular|rxjs|tslib)'],
  moduleNameMapper: {
    '^ftmocks-utils$': '<rootDir>/node_modules/ftmocks-utils/src/index.js',
  },
};
