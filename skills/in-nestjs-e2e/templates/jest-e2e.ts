import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'fs';
import { join } from 'path';

// From {{APP_PATH}}/test/ up to the repo root. Single app: '../..'
// (test/ is one level under app root, app root == repo root → '../..' lands
// at repo root only if test is at <root>/test; adjust to match your layout).
// Monorepo apps/<app>: '../../..'. See {{ROOT_DIR_REL}} in references/detect.md.
const rootDir = join(__dirname, '{{ROOT_DIR_REL}}');

const tsconfig = JSON.parse(
  readFileSync(join(rootDir, 'tsconfig.json'), 'utf-8'),
);

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir,
  testRegex: '{{TEST_REGEX}}',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  // Runs ONCE before the whole suite — resets the schema.
  globalSetup: '<rootDir>/{{APP_PATH}}/test/helpers/global-setup.ts',
  // Resolves tsconfig path aliases (@app/..., src/...) — needed in monorepos,
  // harmless in single-app projects with no aliases.
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths ?? {}, {
    prefix: '<rootDir>/',
  }),
};

export default config;
