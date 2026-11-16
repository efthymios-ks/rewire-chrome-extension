# Rewire

A Chromium side-panel extension to watch HTTP traffic and rewire it.  
Watch the API calls and page navigations of a tab and its iframes, form posts included, search them, export them as HAR, turn any of them into code, or send your own from the HTTP Client tab.  
Follow the page's WebSockets, server-sent events and postMessage messages, open your own sockets and streams, and read `.har` files.  
Rewire traffic with ordered rules, grouped in profiles with their own variables: mock responses, add latency, send production calls to localhost, set headers, query params and cookies.

## Contents

- [Overview](docs/Overview.md): runtime, architecture, layout, build output, tests, conventions, theme and width, permissions
- [Traffic](docs/Traffic.md): timeline, iframes and the frame filter, waterfall, search, HAR export, inspector, code snippets
- [Rules](docs/Rules.md): where rules work and their order, wildcards, operations, editor, testers, profiles, variables, import and export
- [Rule catalog](docs/RuleCatalog.md): every rule type and where it works
- [Rule JSON](docs/RuleJson.md): every rule, condition and profile as import JSON, with examples, ready to hand to an assistant
- [Cookie Jar](docs/CookieJar.md): HttpOnly and Secure cookies, cookie rules
- [JWT](docs/Jwt.md): decode tokens and check their expiry
- [HTTP Client](docs/HttpClient.md): send your own requests, paste cURL or Wget commands, copy them as code, read the answers
- [WS Client](docs/WsClient.md): the page's WebSockets and your own, frames, handshake headers
- [SSE Client](docs/SseClient.md): the page's event streams and your own, events
- [postMessage](docs/PostMessage.md): messages between the page and its iframes, sending your own
- [HAR Inspector](docs/HarInspector.md): open, drop or paste a `.har` file and read it with the Traffic timeline and inspector
- [Release](docs/Release.md): Chrome Web Store setup and manual upload
- [Store listing](docs/StoreListing.md): the Chrome Web Store description
- [Privacy](docs/Privacy.md): what the extension reads and where it stays

## Quick start

Needs Windows PowerShell 5.1 or PowerShell 7.

```powershell
powershell -File .\Start-Debug.ps1
```

Installs Node.js and the npm packages when they're missing, then opens Chrome with its own profile, the extension loaded, and a rebuild on every save.  
It also opens `https://httpbin.org/#/` as a page to watch.  
Click the toolbar icon to open the side panel.

Branded Chrome 137+ ignores `--load-extension`.  
On the first run there, turn on Developer mode in `chrome://extensions`, click "Load unpacked" and pick `dist`.  
The debug profile keeps it.

## Test

```powershell
powershell -File .\Invoke-Test.ps1                                # type check, then every test
powershell -File .\Invoke-Test.ps1 -Path .\src\Common\Rules       # one folder
powershell -File .\Invoke-Test.ps1 -TestName 'compile_When'       # by name
powershell -File .\Invoke-Test.ps1 -Watch                         # rerun on save
powershell -File .\Invoke-Test.ps1 -ResultPath .\testResults.xml  # JUnit XML
powershell -File .\Invoke-Test.ps1 -InstallOnly                   # only Node.js and the npm packages
```

Makes sure the tools are there first.  
Node.js is installed with winget when it is missing or older than `-MinimumNodeVersion`, and `npm ci` runs when `node_modules` is missing or older than `package-lock.json`.  
Then it type-checks all of `src`, tests included, whatever `-Path` is, and runs Vitest over the `*.test.ts` files under `-Path`.  
Tests sit beside their source as `<Name>.test.ts`; `vitest.config.ts` runs the ones under `src\SidePanel` in happy-dom (`panel`) and every other one in Node (`logic`).  
`Start-Debug.ps1` and `Publish-Extension.ps1` go through the same install step.  
Exit codes: `0` passed (or tools ready with `-InstallOnly`), `1` type errors or failures, `2` path not found or no tests discovered, `3` Node.js or the npm packages unavailable.

| Parameter             | Meaning                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `-Path`               | Test folder or file. Default `.\src`.                               |
| `-TestName`           | Only tests whose name contains this text, or matches it as a regex. |
| `-Output`             | `None`, `Normal` or `Detailed`. Default `Detailed`.                 |
| `-ResultPath`         | Also write JUnit XML to this path.                                  |
| `-Watch`              | Rerun on save until Ctrl+C, without the type check.                 |
| `-SkipTypeCheck`      | Run the tests only.                                                 |
| `-MinimumNodeVersion` | Oldest Node.js major accepted. Default `20`.                        |
| `-InstallOnly`        | Make sure Node.js and the npm packages are there, then stop.        |
| `-SkipInstall`        | Never install Node.js; fail instead. Packages still restore.        |

## Debug

```powershell
powershell -File .\Start-Debug.ps1
powershell -File .\Start-Debug.ps1 -Browser Edge -Url http://localhost:3000
powershell -File .\Start-Debug.ps1 -BrowserPath 'C:\Tools\chrome-for-testing\chrome.exe'
powershell -File .\Start-Debug.ps1 -NoWatch
```

- After a rebuild, press the reload icon on the extension card in `chrome://extensions`.
- Side panel DevTools: right-click an empty spot of the panel, outside the timeline and inspector, then Inspect.
- Worker DevTools: the "service worker" link on the extension card.
- Source maps are on, so breakpoints work in the TypeScript files.

The script builds into `dist`, then opens the browser on `chrome://extensions` and `-Url`.  
Exit codes: `0` the watcher stopped (or the browser opened with `-NoWatch`), `1` the first build failed, `3` Node.js, the npm packages or the browser unavailable.

| Parameter      | Meaning                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| `-Browser`     | `Chrome`, `Edge` or `Chromium`. Default `Chrome`.                           |
| `-BrowserPath` | Explicit executable, for example Chrome for Testing. Wins over `-Browser`.  |
| `-Url`         | Page to open next to the extensions page. Default `https://httpbin.org/#/`. |
| `-ProfilePath` | Browser profile. Default `.debug-profile`.                                  |
| `-NoWatch`     | Build once, open the browser, and return.                                   |

## Build and package

```powershell
powershell -File .\Publish-Extension.ps1                          # prompts for the version
powershell -File .\Publish-Extension.ps1 -Version 1.0.1           # non-interactive
powershell -File .\Publish-Extension.ps1 -Version 1.0.1 -Force    # replace an existing 1.0.1 package
powershell -File .\Publish-Extension.ps1 -Version 1.0.1 -WhatIf   # check, then report without doing anything
```

Called without `-Version`, the script prints the version from `public\manifest.json` and prompts for the next one, suggesting the next patch.  
The version must look like `1.2.3`, without leading zeros, and be higher than the one in `public\manifest.json`, compared number by number (`1.0.10` is higher than `1.0.9`), since the store takes each upload only with a higher version.  
An existing `Rewire-<version>` folder or zip in the output folder stops the script before anything runs, unless `-Force` is passed.  
`-WhatIf` runs these checks and reports what would happen, without testing, stamping or building.

Then the suite runs, through `Invoke-Test.ps1 -Output None`.  
A red test stops the script before anything is built or stamped.  
The version is written into `public\manifest.json`, then the build picks it up.  
Output lands in `artifacts\Rewire-<version>\` (loose folder for sideloading) and `artifacts\Rewire-<version>.zip` (for upload), both without source maps.  
The zip is checked last: `manifest.json` at the root with the stamped version, the entry points and icons present, no `.map` files.  
Exit codes: `0` packaged (or nothing done with `-WhatIf`), `1` the version is invalid or not higher, the package exists without `-Force`, or a step failed.

| Parameter     | Meaning                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `-Version`    | Version to stamp, as `1.2.3`, above the manifest's. Omit to be prompted.  |
| `-OutputPath` | Where the folder and zip go. Default `.\artifacts`.                       |
| `-SkipTests`  | Package without the suite. Node.js and the packages still install.        |
| `-Force`      | Replace an existing folder and zip for the same version.                  |
| `-WhatIf`     | Check the version and output folder, then stop without changing anything. |
| `-Confirm`    | Ask before testing, stamping, building and packaging.                     |

Upload the zip by hand in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). See [Release](docs/Release.md) for the full checklist.

## Source zip

```powershell
.\Compress-Source.ps1   # .\rewire-chrome-extension.zip, without what .gitignore lists
```

Zips every file git would commit, tracked and untracked, under one folder named after the repo folder, and replaces the previous zip.  
Deletes nothing and leaves out `.git`; `node_modules`, `dist`, `artifacts`, `.debug-profile`, `.playwright-mcp`, `testResults.xml`, `*.log` and `*.zip` never go in.  
Without git, it leaves out the same folders, at any depth, and files by name.  
Takes no parameters. Exit codes: `0` zipped, `1` a step failed.  
Like every script here, it runs on Windows PowerShell 5.1 and PowerShell 7.  
Started from Explorer, it waits for Enter before the window closes.

## License

[MIT](LICENSE), Efthymios Koktsidis.
