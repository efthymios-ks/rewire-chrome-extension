import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as esbuild from "esbuild";
import * as sass from "sass";

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
];

const scssEntries = [
    {
        from: join(rootDirectory, "src", "SidePanel", "styles.scss"),
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
    target: "chrome126",
    loader: {
        ".md": "text",
    },
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

async function compileScssAsync() {
    for (const entry of scssEntries) {
        const result = sass.compile(entry.from, {
            style: "expanded",
            sourceMap: true,
        });

        await mkdir(dirname(entry.to), { recursive: true });
        await writeFile(entry.to, result.css, "utf-8");

        if (result.sourceMap != null) {
            await writeFile(`${entry.to}.map`, JSON.stringify(result.sourceMap), "utf-8");
        }
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

function watchScss() {
    watch(join(rootDirectory, "src", "SidePanel"), { recursive: true }, (_eventType, filename) => {
        if (filename != null && !filename.endsWith(".scss")) {
            return;
        }

        compileScssAsync().catch((error) => {
            console.error("SCSS compile failed.", error);
        });
    });
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
await compileScssAsync();

if (isWatchMode) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    watchStaticAssets();
    watchScss();
}
else {
    await esbuild.build(buildOptions);
}
