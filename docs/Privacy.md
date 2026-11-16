# Privacy policy

**Last updated:** 2026-11-16

## Summary

Rewire is a developer tool that runs entirely on your device. It does not collect, store on remote servers, sell, share, or transmit any user data. It has no server, no analytics, and no remote code.

## What data Rewire handles

While you have the side panel open on a tab you choose, Rewire can see:

- HTTP requests and responses of that tab and its iframes, page loads and form submissions included: URLs, methods, status codes, headers and bodies, such as a page's HTML and the fields a form sends.
- WebSocket frames, server-sent events and `postMessage` messages of that tab and its iframes, only while you turn on the matching listen switch.
- Cookies of that tab, if you open the Cookie Jar.

While you use the extension, Rewire stores the following locally in your browser profile:

- In `chrome.storage.local`: your profiles, with their rules and the variables you type, which profile is active, the **Interception** switch, your pinned endpoints and the sample URLs the rule testers start with. They stay until you change or delete them, or remove the extension.
- In `chrome.storage.session`: rule hit counts, values captured by **Set variable** rules and the outcome of the last rule sync. They are cleared when the browser restarts or the extension reloads or updates.
- In the side panel's `localStorage`: the theme (`rewire.theme`: `system` until you press the theme button, then `light` or `dark`), where the Traffic tab splits the timeline from the inspector (`rewire.splitRatio`) and whether the inspector is folded away (`rewire.inspectorCollapsed`). They stay until you remove the extension.
- As `chrome.declarativeNetRequest` dynamic rules: the rules of the active profile that work on all tabs. They are replaced whenever your rules change, and removed when you turn **Interception** off or remove the extension.
- As a `chrome.declarativeNetRequest` session rule: the handshake headers of a WebSocket you open from the WS Client tab. It is removed when the socket closes, or, if the panel closes first, when a panel next opens in that window, when a panel opens or connects after that window is closed, or when the browser restarts.
- In the service worker's memory: captured request and response data, page loads with their HTML included, WebSocket frames, server-sent events and `postMessage` messages, for the inspected tab and up to 5 tabs inspected before it. They are cleared when the tab closes, the panel closes, or the browser restarts.

## What Rewire does not do

- No telemetry. No analytics. No usage tracking.
- No accounts, no logins.
- No remote code execution. All code is bundled into the extension at build time.
- No transmission of any captured data off your device.
- No sharing of any data with third parties.
- No selling of any data.

## Exports

**Copy rule format** copies the same fixed guide every time, how rules are written as JSON; it holds none of your rules, variables or traffic. Profile exports and HAR files are files you generate explicitly. By default HAR files blank cookie values, `Authorization` headers and API keys; profile exports blank them in request header, response header, mock response and cookie rules, and also blank variables whose names look secret. You can opt in to include them. HAR files leave out binary request bodies. Export files stay on your disk unless you share them.

## HTTP Client tab

The HTTP Client tab sends only the HTTP requests you explicitly compose and submit from it. Those requests are logged into the inspected tab's timeline for your reference. Files you attach are logged by name and size only, never their contents.

## WS Client and SSE Client tabs

The WS Client and SSE Client tabs open only the sockets and event streams you explicitly start from them, to the URLs you type, with the headers you add. Their frames and events stay in the panel's memory and are dropped when the panel closes. Messages are sent only through sockets you opened, never through the page's sockets.

## postMessage tab

Only while you turn on **Listen to page messages**, Rewire adds a listener for `message` events to the inspected page and its iframes, through the debugger, and reports each message to the panel. Turning the switch off removes the listener from the page and its iframes. If you close the panel or inspect another tab while the switch is on, the listener stays in that page, reporting nothing, until the page reloads. Messages you send from the tab are posted only to the page or the iframe you pick.

## HAR Inspector tab

The HAR Inspector tab reads the `.har` file you open, drop or paste on it, entirely inside the panel. The file is never uploaded or stored; closing the file or the panel drops it.

## JWT tab

The JWT tab decodes the tokens you paste into it, or open from the inspector, entirely inside the panel. Tokens are never sent anywhere.

## Contact

Privacy questions: Efthymios Koktsidis, efthymios.ks@gmail.com
