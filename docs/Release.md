# Release

Packaging is local and uploads are manual: there is no CI and no git tag step.  
`Publish-Extension.ps1` asks for the version, runs the tests, stamps the version, builds `dist`, and writes a versioned folder and zip under `artifacts\`.  
The zip goes to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) by hand.

The scripts run on Windows PowerShell 5.1 and PowerShell 7; `powershell -File` and `pwsh -File` both work.

## 1. One-time store setup

1. Register a publisher account at the dashboard ($5, one-time).
2. Package locally so there is a zip to upload for the first time:
   ```powershell
   powershell -File .\Publish-Extension.ps1
   ```
   Press Enter at the prompt to accept the suggested version.
3. In the dashboard, **Add new item** and upload `artifacts\Rewire-<version>.zip`.
4. Fill the listing: the detailed description and category (see [Store listing](StoreListing.md); the name and short description come from the manifest), a 128×128 icon, at least one 1280×800 or 640×400 screenshot, and a privacy policy URL (see [Privacy](Privacy.md)).
5. In the privacy section, paste the single purpose, one justification per permission, and the remote code and data usage answers from [Store listing](StoreListing.md#single-purpose).
   Vague answers get rejected.
6. Submit for review.
   First-time reviews take longer; later updates usually take minutes to hours.

## 2. Release

Each time you ship a version:

```powershell
powershell -File .\Publish-Extension.ps1                 # prompts for the version
powershell -File .\Publish-Extension.ps1 -Version 1.2.3  # no prompt
```

The script:

1. Prints the version in `public\manifest.json` and prompts for the next one, suggesting the next patch.
   Press Enter to take the suggestion, or pass `-Version 1.2.3` to skip the prompt.
   The version must look like `1.2.3`, without leading zeros, and be higher than the manifest's, compared number by number, so `1.0.10` beats `1.0.9`.
   A folder or zip already under `artifacts\` for that version stops the script; `-Force` replaces it.
   `-WhatIf` stops here and reports what would run.
2. Runs `Invoke-Test.ps1`: type check and the full suite.
   A red suite stops it before anything is stamped or built.
   `-SkipTests` only makes sure Node.js and the npm packages are there.
3. Writes the version into `public\manifest.json`, the source of truth; commit it.
4. Builds `dist` with `scripts\build.mjs`.
5. Copies the build, without source maps, into `artifacts\Rewire-<version>\` and zips it into `artifacts\Rewire-<version>.zip`.
6. Checks the zip: `manifest.json` at the root with the new version, `background.js`, `sidepanel/index.html`, `sidepanel/main.js`, `sidepanel/app.css` and the manifest's icons present, no `.map` files.

Then, in the dashboard:

1. Open the existing item.
2. **Package → Upload new package**, pick the zip.
3. Submit for review.

The store only takes dot-separated numbers, and each upload must have a higher version than the previous one; the script checks that against the manifest before it does anything else.  
`-OutputPath` writes the folder and zip somewhere other than `artifacts\`.

## Local sideload

The versioned folder next to the zip is handy for a smoke test before you submit:

1. `chrome://extensions` → Developer mode on → **Load unpacked**.
2. Pick `artifacts\Rewire-<version>\`.
