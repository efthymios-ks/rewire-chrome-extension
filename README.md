# Rewire

A Chromium side-panel extension to watch HTTP traffic and rewire it.  
Watch the API calls of a tab, search them, export them as HAR, turn any of them into code, or send your own from the Client tab.  
Rewire traffic with ordered rules, grouped in profiles with their own variables: mock responses, add latency, send production calls to localhost, set headers, query params and cookies.

## Contents

- [Overview](docs/Overview.md): runtime, layout, architecture, permissions
- [Traffic](docs/Traffic.md): timeline, waterfall, search, HAR export, inspector, code snippets
- [Rules](docs/Rules.md): where rules work and their order, wildcards, operations, editor, testers, profiles, variables, import and export
- [Rule catalog](docs/RuleCatalog.md): every rule type and where it works
- [Cookie Jar](docs/CookieJar.md): HttpOnly and Secure cookies, cookie rules
- [Client](docs/Client.md): send your own requests, paste cURL or Wget commands, read the answers
- [JWT](docs/Jwt.md): decode tokens and check their expiry
- [Release](docs/Release.md): Chrome Web Store setup and manual upload
- [Store listing](docs/StoreListing.md): the Chrome Web Store description
- [Privacy](docs/Privacy.md): what the extension reads and where it stays

## Quick start

Needs Windows PowerShell 5.1.

```powershell
powershell -File .\Start-Debug.ps1
```

Installs Node.js and the npm packages when they're missing, then opens Chrome with its own profile, the extension loaded, and a rebuild on every save.  
Click the toolbar icon to open the side panel.

Branded Chrome 137+ ignores `--load-extension`.  
On the first run there, turn on Developer mode in `chrome://extensions`, click "Load unpacked" and pick `dist`.  
The debug profile keeps it.

## Test

```powershell
powershell -File .\Invoke-Test.ps1                                # type check, then every test
powershell -File .\Invoke-Test.ps1 -Path .\tests\Common\Rules     # one folder
powershell -File .\Invoke-Test.ps1 -TestName 'compile_When'       # by name
powershell -File .\Invoke-Test.ps1 -Watch                         # rerun on save
powershell -File .\Invoke-Test.ps1 -ResultPath .\testResults.xml  # JUnit XML
powershell -File .\Invoke-Test.ps1 -InstallOnly                   # only Node.js and the npm packages
```

Makes sure the tools are there first.  
Node.js is installed with winget when it is missing or older than 20, and `npm ci` runs when `node_modules` is missing or older than `package-lock.json`.  
Then it type-checks `src` and `tests`, and runs Vitest over `tests\`.  
`Start-Debug.ps1` and `Publish-Extension.ps1` go through the same install step.  
Exit codes: `0` passed, `1` type errors or failures, `2` no tests discovered, `3` Node.js or the npm packages unavailable.

| Parameter             | Meaning                                                        |
| --------------------- | -------------------------------------------------------------- |
| `-Path`               | Test folder or file. Default `.\tests`.                        |
| `-TestName`           | Only tests whose name contains this text, or matches it as a regex. |
| `-Output`             | `None`, `Normal` or `Detailed`. Default `Detailed`.            |
| `-ResultPath`         | Also write JUnit XML to this path.                             |
| `-Watch`              | Rerun on save, without the type check.                         |
| `-SkipTypeCheck`      | Run the tests only.                                            |
| `-MinimumNodeVersion` | Oldest Node.js major accepted. Default `20`.                   |
| `-InstallOnly`        | Make sure Node.js and the npm packages are there, then stop.   |
| `-SkipInstall`        | Never install Node.js; fail instead. Packages still restore.   |

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

| Parameter      | Meaning                                                   |
| -------------- | --------------------------------------------------------- |
| `-Browser`     | `Chrome`, `Edge` or `Chromium`. Default `Chrome`.         |
| `-BrowserPath` | Explicit executable, for example Chrome for Testing.      |
| `-Url`         | Page to open next to the extensions page.                 |
| `-ProfilePath` | Browser profile. Default `.debug-profile`.                |
| `-NoWatch`     | Build once and return.                                    |

## Build and package

```powershell
powershell -File .\Publish-Extension.ps1                   # prompts for the new version
powershell -File .\Publish-Extension.ps1 -Version 1.0.1    # non-interactive
```

The suite runs first.  
A red test stops the script before anything is built.  
The new version is written into `public\manifest.json`, then the build picks it up.  
Output lands in `artifacts\Rewire-<version>\` (loose folder for sideloading) and `artifacts\Rewire-<version>.zip` (for upload), both without source maps.

Called without `-Version`, the script prints the current version from `public\manifest.json` and prompts for the new one, suggesting the next patch.

| Parameter     | Meaning                                                      |
| ------------- | ------------------------------------------------------------ |
| `-Version`    | Version to stamp, as `1.2.3`. Omit to be prompted.           |
| `-OutputPath` | Where the folder and zip go. Default `.\artifacts`.          |
| `-SkipTests`  | Package without the suite.                                   |
| `-Force`      | Overwrite an existing versioned folder and zip.              |

Upload the zip by hand in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). See [Release](docs/Release.md) for the full checklist.

## Source zip

```powershell
.\Compress-Source.ps1   # .\Rewire.zip, without node_modules, dist, artifacts or .debug-profile
```

Zips every file git would commit, under one `Rewire` folder, and replaces the previous zip.  
Deletes nothing.  
Without git, it leaves out the same folders by name.  
Like every script here, it runs on Windows PowerShell 5.1, so a double-click from Explorer works.

## License

[MIT](LICENSE), Efthymios Koktsidis.
