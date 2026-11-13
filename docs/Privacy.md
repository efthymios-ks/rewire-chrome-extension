# Privacy Policy

**Last updated:** 2026-11-13

## Summary

Rewire is a developer tool that runs entirely on your device. It does not collect, store on remote servers, sell, share, or transmit any user data. It has no server, no analytics, and no remote code.

## What data Rewire handles

While you have the side panel open on a tab you choose, Rewire can see:

- HTTP requests and responses of that tab and its iframes: URLs, methods, status codes, headers and bodies.
- WebSocket frames, server-sent events and `postMessage` messages of that tab and its iframes, only while you turn on the matching listen switch.
- Cookies of that tab, if you open the Cookie Jar.

While you use the extension, Rewire stores the following locally in your browser profile:

- Your profiles, with their rules and the variables you type, and your panel settings, in `chrome.storage.local`.
- Rule hit counts and captured variable values, in `chrome.storage.session`, cleared when you restart the browser.
- Captured request and response data, WebSocket frames, server-sent events and `postMessage` messages, in the service worker's memory, for the inspected tab and up to 5 tabs inspected before it, cleared when the tab closes, the panel closes, or the browser restarts.
- The handshake headers of a WebSocket you open from the WS Client tab, in a `chrome.declarativeNetRequest` session rule that is removed when the socket closes.

## What Rewire does not do

- No telemetry. No analytics. No usage tracking.
- No accounts, no logins.
- No remote code execution. All code is bundled into the extension at build time.
- No transmission of any captured data off your device.
- No sharing of any data with third parties.
- No selling of any data.

## Exports

**Copy rule format** copies the same fixed guide every time, how rules are written as JSON; it holds none of your rules, variables or traffic. Profile exports and HAR files are files you generate explicitly. By default they omit cookie values, `Authorization` headers and API keys, and profile exports also blank variables whose names look secret; you can opt in to include them. Export files stay on your disk unless you share them.

## HTTP Client tab

The HTTP Client tab sends only the HTTP requests you explicitly compose and submit from it. Those requests are logged into the inspected tab's timeline for your reference. Files you attach are logged by name and size only, never their contents.

## WS Client and SSE Client tabs

The WS Client and SSE Client tabs open only the sockets and event streams you explicitly start from them, to the URLs you type, with the headers you add. Their frames and events stay in the panel's memory and are dropped when the panel closes. Messages are sent only through sockets you opened, never through the page's sockets.

## postMessage tab

Only while you turn on **Listen to page messages**, Rewire adds a listener for `message` events to the inspected page and its iframes, through the debugger, and reports each message to the panel. Turning the switch off removes the listener. Messages you send from the tab are posted only to the page or the iframe you pick.

## HAR Inspector tab

The HAR Inspector tab reads the `.har` file you open, drop or paste on it, entirely inside the panel. The file is never uploaded or stored; closing the file or the panel drops it.

## JWT tab

The JWT tab decodes the tokens you paste into it, or open from the inspector, entirely inside the panel. Tokens are never sent anywhere.

## Contact

Privacy questions: Efthymios Koktsidis, efthymios.ks@gmail.com
