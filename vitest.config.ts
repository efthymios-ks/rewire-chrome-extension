import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const MarkdownSuffix = ".md";

const markdownAsText: Plugin = {
    name: "markdown-as-text",
    transform(code, id) {
        return id.endsWith(MarkdownSuffix) ? `export default ${JSON.stringify(code)};` : null;
    },
};

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: "logic",
                    include: [
                        "tests/Background/**/*Tests.ts",
                        "tests/Common/**/*Tests.ts",
                    ],
                    environment: "node",
                },
            },
            {
                plugins: [markdownAsText],
                test: {
                    name: "panel",
                    include: ["tests/SidePanel/**/*Tests.ts"],
                    environment: "happy-dom",
                },
            },
        ],
    },
});
