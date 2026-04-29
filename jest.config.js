/** @type {import('ts-jest').JestConfigWithTsJest} **/
// `module: es2020` in tsconfig.json is required so `verbatimModuleSyntax`
// accepts our `import`/`export` source syntax. Jest runs in a CommonJS
// runtime, so we override `module` to `commonjs` (and disable verbatim,
// which would then forbid that ES syntax) just for the test transform.
module.exports = {
    testEnvironment: 'node',
    globalSetup: './test/setup.ts',
    transform: {
        '^.+.tsx?$': [
            'ts-jest',
            {
                tsconfig: {
                    module: 'commonjs',
                    verbatimModuleSyntax: false,
                },
            },
        ],
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
    testMatch: ['**/?(*.)+(test).ts'],
};
