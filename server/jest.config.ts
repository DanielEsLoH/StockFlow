import type { Config } from 'jest';

const config: Config = {
  // Module configuration
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',

  // Setup file to load .env.test before tests run
  // This ensures tests use the Docker test database (stockflow_test)
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],

  // Coverage collection configuration
  collectCoverageFrom: [
    // Include these file patterns
    '**/*.service.ts',
    '**/*.controller.ts',
    '**/*.guard.ts',
    '**/*.strategy.ts',
    '**/*.interceptor.ts',
    '**/*.filter.ts',
    '**/*.middleware.ts',
    '**/*.pipe.ts',
    '**/*.gateway.ts',
    '**/*.resolver.ts',

    // Exclude patterns
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.interface.ts',
    '!**/*.enum.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/*.constants.ts',
    '!**/*.mock.ts',
    '!**/*.stub.ts',
    '!**/index.ts',
  ],

  // Coverage output directory
  coverageDirectory: '../coverage',

  // Coverage reporters
  coverageReporters: [
    'text', // Terminal output with line-by-line coverage
    'text-summary', // Summary at the end of terminal output
    'html', // Browser-viewable HTML report
    'lcov', // For CI/CD integration (SonarQube, Codecov, etc.)
    'json', // Programmatic access to coverage data
    'json-summary', // Summary JSON for badges and quick parsing
  ],

  // Coverage thresholds - fail if coverage drops below these percentages
  // Current coverage baseline (Jan 2026):
  // - Statements: 78.51%
  // - Branches: 58.25%
  // - Functions: 66.15%
  // - Lines: 78.42%
  //
  // Strategy: Set thresholds slightly below current levels to prevent regression.
  // Increase thresholds as coverage improves. Target: 80% global, 85% for critical modules.
  coverageThreshold: {
    // Global thresholds apply to the entire codebase
    global: {
      branches: 55, // Target: 80% (current: 58.25%)
      functions: 65, // Target: 80% (current: 66.15%)
      lines: 75, // Target: 80% (current: 78.42%)
      statements: 75, // Target: 80% (current: 78.51%)
    },
    // NOTE: Per-file thresholds for auth and users modules are commented out
    // until controller tests are added. Currently, controllers have 0% coverage.
    // Uncomment these once controller tests are implemented:
    //
    // '**/auth/**/*.service.ts': {
    //   branches: 85,
    //   functions: 90,
    //   lines: 95,
    //   statements: 95,
    // },
    // '**/users/**/*.service.ts': {
    //   branches: 90,
    //   functions: 100,
    //   lines: 95,
    //   statements: 95,
    // },
  },

  // Paths to ignore during coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/test/',
    '/coverage/',
    '\\.d\\.ts$',
  ],

  // Additional Jest configuration
  verbose: true,
  clearMocks: true,
  restoreMocks: true,

  // Module path aliases (if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock @arcjet/node to avoid ESM import issues in tests
    '^@arcjet/node$': '<rootDir>/__mocks__/@arcjet/node.ts',
  },
};

export default config;