import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as esbuild from 'esbuild';
import * as sass from 'sass';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT_DIRECTORY = join(
    /* ...paths: */ dirname(SCRIPT_PATH),
    /* ...paths: */ '..',
);
const OUTPUT_DIRECTORY = join(ROOT_DIRECTORY, 'dist');
const SIDE_PANEL_SOURCE_DIRECTORY = join(
    /* ...paths: */ ROOT_DIRECTORY,
    /* ...paths: */ 'src',
    /* ...paths: */ 'SidePanel',
);
const SIDE_PANEL_OUTPUT_DIRECTORY = join(OUTPUT_DIRECTORY, 'sidepanel');
const IS_WATCH_MODE = process.argv.includes('--watch');

const STATIC_ASSETS = [
    {
        from: join(ROOT_DIRECTORY, 'public'),
        to: OUTPUT_DIRECTORY,
    },
    {
        from: join(SIDE_PANEL_SOURCE_DIRECTORY, 'index.html'),
        to: join(SIDE_PANEL_OUTPUT_DIRECTORY, 'index.html'),
    },
];

const SCSS_ENTRIES = [
    {
        from: join(SIDE_PANEL_SOURCE_DIRECTORY, 'app.scss'),
        to: join(SIDE_PANEL_OUTPUT_DIRECTORY, 'app.css'),
    },
];

const BUILD_OPTIONS = {
    entryPoints: [
        {
            in: join(
                /* ...paths: */ ROOT_DIRECTORY,
                /* ...paths: */ 'src',
                /* ...paths: */ 'Background',
                /* ...paths: */ 'main.ts',
            ),
            out: 'background',
        },
        {
            in: join(SIDE_PANEL_SOURCE_DIRECTORY, 'main.ts'),
            out: 'sidepanel/main',
        },
    ],
    outdir: OUTPUT_DIRECTORY,
    bundle: true,
    format: 'esm',
    target: 'chrome126',
    loader: {
        '.md': 'text',
    },
    sourcemap: true,
    logLevel: 'info',
};

async function copyStaticAssetsAsync() {
    for (const asset of STATIC_ASSETS) {
        await cp(
            /* source: */ asset.from,
            /* destination: */ asset.to,
            /* options: */ { recursive: true },
        );
    }
}

async function compileScssAsync() {
    for (const entry of SCSS_ENTRIES) {
        const result = sass.compile(
            /* path: */ entry.from,
            /* options: */ {
                style: 'expanded',
                sourceMap: true,
            },
        );

        await mkdir(
            /* path: */ dirname(entry.to),
            /* options: */ { recursive: true },
        );
        await writeFile(
            /* file: */ entry.to,
            /* data: */ result.css,
            /* options: */ 'utf-8',
        );

        if (result.sourceMap != null) {
            await writeFile(
                /* file: */ `${entry.to}.map`,
                /* data: */ JSON.stringify(result.sourceMap),
                /* options: */ 'utf-8',
            );
        }
    }
}

function watchStaticAssets() {
    for (const asset of STATIC_ASSETS) {
        watch(
            /* filename: */ asset.from,
            /* options: */ { recursive: true },
            /* listener: */ async () => {
                try {
                    await copyStaticAssetsAsync();
                } catch (error) {
                    console.error('Copying static files failed.', error);
                }
            },
        );
    }
}

function watchScss() {
    watch(
        /* filename: */ SIDE_PANEL_SOURCE_DIRECTORY,
        /* options: */ { recursive: true },
        /* listener: */ async (_eventType, filename) => {
            if (filename != null && !filename.endsWith('.scss')) {
                return;
            }

            try {
                await compileScssAsync();
            } catch (error) {
                console.error('SCSS compile failed.', error);
            }
        },
    );
}

await rm(OUTPUT_DIRECTORY, { recursive: true, force: true });
await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await copyStaticAssetsAsync();
await compileScssAsync();

if (IS_WATCH_MODE) {
    const context = await esbuild.context(BUILD_OPTIONS);
    await context.watch();
    watchStaticAssets();
    watchScss();
} else {
    await esbuild.build(BUILD_OPTIONS);
}
