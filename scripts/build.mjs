import { cp, mkdir, rm } from "node:fs/promises";
import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as esbuild from "esbuild";

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(rootDirectory, "dist");
const isWatchMode = process.argv.includes("--watch");

const staticAssets = [
    {
        from: join(rootDirectory, "public"),
        to: outputDirectory,
    },
    {
        from: join(rootDirectory, "src", "SidePanel", "index.html"),
        to: join(outputDirectory, "sidepanel", "index.html"),
    },
    {
        from: join(rootDirectory, "src", "SidePanel", "styles.css"),
        to: join(outputDirectory, "sidepanel", "styles.css"),
    },
];

const buildOptions = {
    entryPoints: [
        {
            in: join(rootDirectory, "src", "Background", "main.ts"),
            out: "background",
        },
        {
            in: join(rootDirectory, "src", "SidePanel", "main.ts"),
            out: "sidepanel/main",
        },
    ],
    outdir: outputDirectory,
    bundle: true,
    format: "esm",
    target: "chrome120",
    sourcemap: true,
    logLevel: "info",
};

async function copyStaticAssets() {
    for (const asset of staticAssets) {
        await cp(
            asset.from,
            asset.to,
            {
                recursive: true,
            }
        );
    }
}

function watchStaticAssets() {
    for (const asset of staticAssets) {
        watch(
            asset.from,
            {
                recursive: true,
            },
            () => copyStaticAssets().catch(error => console.error("Copying static files failed.", error))
        );
    }
}

await rm(
    outputDirectory,
    {
        recursive: true,
        force: true,
    }
);
await mkdir(
    outputDirectory,
    {
        recursive: true,
    }
);
await copyStaticAssets();

if (isWatchMode) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    watchStaticAssets();
}
else {
    await esbuild.build(buildOptions);
}
