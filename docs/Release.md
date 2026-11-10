# Release

Packaging is local and uploads are manual: `Publish-Extension.ps1` runs the tests, bumps the version, builds `dist`, and writes a versioned folder and zip under `artifacts\`. The zip goes to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) by hand.

## 1. One-time store setup

1. Register a publisher account at the dashboard ($5, one-time).
2. Package locally so there is a zip to upload for the first time:
   ```powershell
   powershell -File .\Publish-Extension.ps1
   ```
   Press Enter at the prompt to accept the suggested version.
3. In the dashboard, **Add new item** and upload `artifacts\Rewire-<version>.zip`.
4. Fill the listing: name, short and detailed description, category, a 128×128 icon, at least one 1280×800 or 640×400 screenshot, and a privacy policy URL (see [Privacy](Privacy.md)).
5. Under **Permission justifications**, explain `debugger`, `declarativeNetRequest` and `host_permissions` in one or two sentences each. Vague answers get rejected.
6. Submit for review. First-time reviews take longer; subsequent updates are usually minutes to hours.

## 2. Release

Each time you want to ship a new version:

```powershell
powershell -File .\Publish-Extension.ps1
```

The script:

1. Runs the full test suite. A red suite stops it before anything is built.
2. Prints the current version from `public\manifest.json` and prompts for the new one (suggesting the next patch). Pass `-Version 1.2.3` to skip the prompt.
3. Writes the new version into `public\manifest.json` (source of truth, commit it).
4. Builds `dist`.
5. Copies the build (minus source maps) into `artifacts\Rewire-<version>\` and zips it into `artifacts\Rewire-<version>.zip`.
6. Verifies the zip: manifest at the root with the right version, required entry points and icons present, no `.map` files.

Then, in the dashboard:

1. Open the existing item.
2. **Package → Upload new package**, pick the zip.
3. Submit for review.

The store only takes dot-separated numbers and each upload must have a higher version than the previous one.

## Local sideload

The versioned folder next to the zip is handy for a smoke test before you submit:

1. `chrome://extensions → Developer mode on → Load unpacked`
2. Pick `artifacts\Rewire-<version>\`.
