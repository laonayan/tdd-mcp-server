/** @type {import('jest').Config} */
export default {
  // CJS transform mode: ts-jest compiles TS to CommonJS so that jest.mock()
  // hoisting and module interception keep working (native ESM mode does not
  // support jest.mock factories). Source files remain ESM at runtime.
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        // Tests run under CJS interop; allow importing ESM-style sources.
        module: 'CommonJS',
        moduleResolution: 'node10',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        target: 'ES2022',
      },
    }],
  },
  extensionsToTreatAsEsm: [],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testTimeout: 10000,
};
