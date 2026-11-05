# Privacy Policy

**Last updated:** 2026-11-08

## Summary

Rewire is a developer tool that runs entirely on your device. It does not collect, store on remote servers, sell, share, or transmit any user data. It has no server, no analytics, and no remote code.

## What data Rewire handles

While you have the side panel open on a tab you choose, Rewire can see:

- HTTP requests and responses of that tab — URLs, methods, status codes, headers and bodies.
- Cookies of that tab, if you open the Cookie Jar.

While you use the extension, Rewire stores the following locally in your browser profile:

- Your rules and panel settings — in `chrome.storage.local`.
- Rule hit counts and captured variable values — in `chrome.storage.session`, cleared when you restart the browser.
- Captured request and response data — in the service worker's memory, cleared when the tab is detached, the panel closes, or the browser restarts.

## What Rewire does not do

- No telemetry. No analytics. No usage tracking.
- No accounts, no logins.
- No remote code execution. All code is bundled into the extension at build time.
- No transmission of any captured data off your device.
- No sharing of any data with third parties.
- No selling of any data.

## Exports

Rule exports are JSON files you generate explicitly. By default they omit cookie values and `Authorization` headers; you can opt in to include them via the **Include cookie values and auth headers** toggle. Export files stay on your disk unless you share them.

## Client tab

The Client tab sends only the HTTP requests you explicitly compose and submit from it. Those requests are logged into the inspected tab's timeline for your reference.

## Contact

Privacy questions: Efthymios Koktsidis — efthymios.ks@gmail.com
