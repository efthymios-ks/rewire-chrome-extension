# Store listing

The text for the Chrome Web Store listing.  
The short description is the `description` in `public/manifest.json`; the store reads it from the package.  
The detailed description is pasted into the dashboard as plain text, so it carries no Markdown.

## Short description

At most 132 characters.

```text
Inspect HTTP traffic in a side panel and rewire it with ordered rules: mock, redirect, rewrite, set headers. HAR, cURL, JWT.
```

## Detailed description

```text
See the HTTP calls of the tab you are on, and change them with rules, from the browser's side panel.

Traffic
- Live list of fetch and XHR calls: method, status, URL, type, duration
- Calls from iframes too, cross-origin ones included, with a frame filter
- Waterfall view
- Search URLs, headers and bodies, as text or regex
- Filter JSON, GraphQL and form calls
- Pin endpoints to keep their latest call in view
- Switch tabs without losing the list
- Export as HAR

Inspector
- Separate tabs for general info, request headers, request body, response headers and response body
- Cookies and Set-Cookie split into fields, full values
- JSON tree view
- Every value a rule changed is marked
- Copy any call as cURL, Wget, Fetch or PowerShell

Rules
- Mock responses
- Redirect, or silently rewrite URLs, such as production to localhost
- Add, change or remove headers, cookies and query params
- CORS and security header presets
- Allow a page to be embedded in an iframe
- Add latency
- Edit request and response bodies
- Capture values into variables for other rules
- Match on URL, host, method, headers, status and more, with wildcards or regex
- Test rules against a sample request
- Group rules in profiles and switch between them
- Share profiles as a JSON file
- Copy the rule format for an AI chat, and paste its answer back as rules

HTTP Client
- Send your own requests
- Paste a cURL or Wget command to fill in the form
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
- Cookie Jar: view, search, edit and add cookies, HttpOnly ones included
- JWT decoder

Privacy
Everything stays in your browser. No accounts, no tracking, nothing is sent anywhere.
```
