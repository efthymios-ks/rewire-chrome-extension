import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: [
            "tests/**/*Tests.ts",
        ],
        environment: "node",
    },
});
