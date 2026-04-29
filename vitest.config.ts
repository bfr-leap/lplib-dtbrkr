import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        globalSetup: ['./src/test-setup/global-setup.ts'],
        setupFiles: ['./src/test-setup/dotenv-setup.ts'],
    },
});
