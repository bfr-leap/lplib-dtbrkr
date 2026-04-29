import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        globalSetup: ['./test/setup.ts'],
        setupFiles: ['./test/dotenv.setup.ts'],
    },
});
