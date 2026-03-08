/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    testEnvironment: 'node',
    globalSetup: './__tests__/setup.ts',
    transform: {
        '^.+.tsx?$': ['ts-jest', {}],
    },
    setupFiles: ['<rootDir>/jest.setup.js'],
    testMatch: ['**/?(*.)+(test).ts'],
    moduleNameMapper: {
        '^@xata\\.io/client$': '<rootDir>/__mocks__/@xata.io/client.js',
    },
};
