import type { Plugin } from 'vite';
import { configDefaults, defineConfig } from 'vitest/config';

const MARKDOWN_SUFFIX = '.md';

const MARKDOWN_AS_TEXT_PLUGIN: Plugin = {
    name: 'markdown-as-text',
    transform(code, id) {
        if (!id.endsWith(MARKDOWN_SUFFIX)) {
            return null;
        }

        return `export default ${JSON.stringify(code)};`;
    },
};

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: 'logic',
                    include: ['src/**/*.test.ts'],
                    exclude: [...configDefaults.exclude, 'src/SidePanel/**'],
                    environment: 'node',
                },
            },
            {
                plugins: [MARKDOWN_AS_TEXT_PLUGIN],
                test: {
                    name: 'panel',
                    include: ['src/SidePanel/**/*.test.ts'],
                    environment: 'happy-dom',
                },
            },
        ],
    },
});
