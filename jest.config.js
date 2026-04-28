/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testEnvironment: 'node',
    globalSetup: './test/setup.ts',
    transform: {
        '^.+.tsx?$': ['ts-jest', {}],
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
    testMatch: ['**/?(*.)+(test).ts'],
};
