/**
 * End-to-end tests: boot the real Nest app and hit it over HTTP.
 * Requires a Postgres database (CI provides a `postgres` service; locally run
 * `docker compose up -d db`, which matches the default host/port/creds).
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  testEnvironment: 'node',
  testTimeout: 30000,
};
