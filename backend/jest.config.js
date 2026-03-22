/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.ts'],
  globals: {
    'ts-jest': {
      tsconfig: { esModuleInterop: true },
    },
  },
};
