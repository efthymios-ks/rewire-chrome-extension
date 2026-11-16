# Store listing

The text for the Chrome Web Store listing.  
The short description is the `description` in `public/manifest.json`; the store reads it from the package.  
The detailed description is pasted into the dashboard as plain text, so it carries no Markdown.

- Category: Developer Tools
- Language: English

## Short description

At most 132 characters.

```text
Inspect HTTP traffic in a side panel and rewire it with ordered rules: mock, redirect, rewrite, set headers. HAR, cURL, JWT.
```

## Detailed description

```text
See the HTTP calls of the tab you are on, and change them with rules, from the browser's side panel.

Traffic
- Live list of fetch, XHR and beacon calls and every page navigation: method, status, path, host, type, duration
- Calls from iframes too, cross-origin ones included, with a frame filter
- List or waterfall view
- Search the URL, query, headers, bodies and cookies, as text or regex, and list only the matches
- Filter JSON, GraphQL, form and page calls
- Pin endpoints to keep their latest call in view
- Switch tabs without losing the list
- Export as HAR

Inspector
- Separate tabs for general info, request headers, request body, response headers, response body and code
- Cookies and Set-Cookie split into fields, full values
- JSON tree view
- Gzip and deflate request bodies shown as text, other binary bodies as hex
- Every value a rule changed is marked
- Open a JWT from an Authorization header
- Copy any call as cURL, Wget, Fetch or PowerShell
- Turn any call into a mock rule

Rules
- Mock responses
- Redirect, or silently rewrite URLs, such as production to localhost
- Add, change or remove headers, cookies and query params
- CORS and security header presets
- Allow a page to be embedded in an iframe
- Upgrade HTTP to HTTPS
- Add latency
- Edit request and response bodies
- Capture values into variables for other rules
- Match on URL, host, method, headers, status and more, with wildcards or regex
- Rules work on every tab when Chrome allows it, otherwise on the inspected tab
- Hit counts per rule
- Test rules against a sample request
- Group rules in profiles and switch between them
- Share profiles as a JSON file
- Copy the rule format for an AI chat, and paste its answer back as rules

HTTP Client
- Send your own requests
- Paste a cURL or Wget command to fill in the form, or open any captured call
- JSON, XML, form, multipart, file and GraphQL bodies
- Copy the request as cURL, Wget, Fetch or PowerShell

WS Client
- See the page's WebSockets and their frames
- Open your own sockets, with handshake headers, and send messages
- Socket.IO packets shown as JSON

SSE Client
- See the page's server-sent event streams and their events
- Subscribe to your own streams, with headers

postMessage
- See the messages between the page and its iframes
- Send your own message to the page or an iframe

HAR Inspector
- Open, drop or paste a .har file with the same timeline, search and inspector as live traffic

Also
- Cookie Jar: view, search, edit, add and remove cookies, HttpOnly and partitioned ones included
- JWT decoder with expiry check
- Light and dark themes

Good to know
- Chrome shows its "started debugging this browser" bar while the panel inspects a tab
- WebSocket, event stream and postMessage capture stays off until you switch it on

Privacy
Everything stays in your browser. No accounts, no tracking, nothing is sent anywhere.
```

## Single purpose

```text
Rewire is a developer tool to inspect the network traffic of the current tab in the side panel and change it with user-defined rules.
```

## Permission justifications

| Permission                      | Justification |
| ------------------------------- | ------------- |
| `sidePanel`                     | Rewire's whole interface lives in the browser's side panel, which opens when the toolbar icon is clicked. |
| `debugger`                      | Attaches to the tab the user inspects to read its requests, responses, WebSocket frames, server-sent events and postMessage messages, and to apply rules that Chrome's request rules can't express, such as mocks, body edits and latency. It also sends HTTP Client requests that `fetch` can't send as typed, such as a `GET` with a body. |
| `declarativeNetRequest`         | Turns the user's rules that change headers, URLs and query params into dynamic rules, so they work on every tab, and adds the user's handshake headers to a WebSocket opened from the WS Client tab. |
| `declarativeNetRequestFeedback` | Reads which of the user's dynamic rules matched, to show a hit count next to each rule. |
| `storage`                       | Saves the user's profiles, rules, variables and panel settings locally, and keeps hit counts and captured variable values for the browser session. Nothing is synced or uploaded. |
| `cookies`                       | Lists, edits, adds and removes the inspected page's cookies in the Cookie Jar tab, HttpOnly ones included, at the user's request. |
| `alarms`                        | Re-checks every minute the rules that have a time window condition, so they turn on and off at the times the user set. |
| Host permission `<all_urls>`    | The user's rules, the inspector and the HTTP, WS and SSE clients work on whatever site the user is developing or testing, which can't be known in advance. |

Remote code: no. All code ships in the package.  
Data usage: Rewire collects no user data; see [Privacy](Privacy.md).
