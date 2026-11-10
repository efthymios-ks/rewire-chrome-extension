import { defineConfig } from "vitest/config";

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
                test: {
                    name: "panel",
                    include: ["tests/SidePanel/**/*Tests.ts"],
                    environment: "happy-dom",
                },
            },
        ],
    },
});
