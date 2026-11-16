# Traffic

The Traffic tab lists the fetch, XHR and `navigator.sendBeacon` calls of the active tab in the panel's window, and every page navigation: pages opened from the address bar or a link, reloads, form posts and iframe documents, whatever they answer, HTML included.  
A page that loaded before the panel inspected its tab shows once the tab reloads.  
The images, scripts and styles a page loads through its tags never enter the timeline; the same files fetched with `fetch` or XHR do.  
Calls from the page's iframes join the timeline too, cross-origin ones included.  
Requests sent from the [HTTP Client](HttpClient.md) tab join the timeline of the inspected tab.  
WebSocket frames, server-sent events and postMessage messages never enter the timeline; they show in the [WS Client](WsClient.md), [SSE Client](SseClient.md) and [postMessage](PostMessage.md) tabs while their listen switch is on.  
A `.har` file opens in the [HAR Inspector](HarInspector.md) tab, apart from this timeline.

## Split view

The timeline sits on top and the inspector below.  
From 720 px wide they sit side by side.  
Drag the handle, or focus it and use the arrow keys.  
The arrow button on the handle slides the inspector away, down or to the right, so the timeline gets the room; picking a call, clicking the button again, or moving the handle brings it back.  
The split, and whether the inspector is away, stay as you left them when the panel reopens.

## Timeline

Each row shows method, status, path, host, content kind, a **Rules** badge when rules acted on it, and duration.  
Newest calls come first, up to 500 per tab.  
Switching tabs inspects the tab you switch to; the one you left is detached, and its timeline is kept, so switching back shows it again with the new calls on top.  
Up to 5 tabs you left keep their timeline; leaving a sixth drops the oldest.  
Closing a tab clears its timeline, and closing the panel clears them all.  
Navigating keeps the timeline.  
When the debugger can't attach, or can't set the tab up for capture, as on `chrome://` pages, the header shows **Failed**, with the reason in its tooltip, and **Reattach**.  
The panel tries again on **Reattach**, when the tab moves to another address, and each time the tab is inspected again.

- The list scrolls to a call only when you pick it, so calls arriving while you read never pull it back to the selected row.
- Hover **Rules** for the names of the rules that acted on the call.
- A redirect splits a call: the hop keeps its own row with the `3xx` answer, and the call goes on in a row for the new URL, without the body when the redirect turns it into a `GET`.
- A page navigation is a call like any other, of type `Document` in **General**: a form post keeps the fields it sent as its request body, and a page its HTML as its response body.
- An all-tabs rule that rewrites a URL shows as a `307 Internal Redirect` hop with the **Rules** badge, and the call goes on in a row for the new URL.
- Right-click a row, or the inspector, to **Open in HTTP Client** or to copy the call in any format of the **Code** tab, with its default parts.

## Toolbar

The first row holds the content filter chips and the call count, listed and captured, such as `12 / 40`; it follows the content filter, the frame list and the search.  
The second row holds the layout list, the frame list, **Open frame**, **HAR** and **Clear**.  
**Clear** empties this tab's timeline; when it can't, a notice says why.

## Frame filter

The frame list keeps the calls of one frame.

| Item            | Keeps                                                              |
| --------------- | ------------------------------------------------------------------ |
| All frames      | every captured call                                                |
| `top`           | the calls of the page itself, and calls that belong to no frame    |
| an iframe       | the calls of that iframe, such as `pay.example.com · /checkout`    |

- The list offers each iframe that made a call, named by its host and path, without the query, such as `pay.example.com · /checkout`.
  An iframe at the root of its site shows its host alone, and a long path keeps its end, such as `cdn.example.com · /…/payment/v3/index.html`.
- Iframes that would share a name are numbered in frame order, such as `ads.example.net · /slot (2)`.
- An iframe that isn't on `http` or `https` keeps its host, or its whole address when it has none, such as `about:blank`.
- **Open frame** shows while an iframe is picked, and opens the iframe's page in a new browser tab.
- When the picked iframe's calls are cleared, the list goes back to **All frames**.
- The count, the list and the waterfall follow the frame list as well as the content filter and the search.

## HAR export

**HAR** in the toolbar opens a menu:

| Item                                         | Effect                                                     |
| -------------------------------------------- | ---------------------------------------------------------- |
| Download HAR                                 | saves `<host>-<UTC time>.har`, such as `api.example.com-2026-11-12T10-30-45.har` |
| Copy HAR                                     | puts the same file on the clipboard                        |
| Download HAR with cookies and auth headers   | the same file, secrets kept                                |
| Copy HAR with cookies and auth headers       | the same, on the clipboard                                 |

- The file is HAR 1.2 and holds every captured call of this tab, oldest first, whatever the content filter shows.
- Without secrets, `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie`, `X-Api-Key`, `Api-Key` and `X-Auth-Token` header values are blanked, and so are cookie values.
- Each entry carries headers, query, cookies, the request body as `postData`, the response body as `content.text`, and the duration as `wait`.
  `content.size` is in bytes; header sizes, the response `bodySize` and the HTTP version are not captured, so they are `-1` and empty.
- Request headers stay as sent, `Content-Encoding` included, and the request `bodySize` counts the bytes sent, not the decoded text.
- A decompressed request body goes in as its text, and `postData.comment` says so, such as `Decoded by Rewire: Decompressed from gzip (39 bytes → 19 bytes). The request sent 39 bytes.`
- A binary request body is left out: `postData` keeps its `mimeType` and a comment, such as `Binary body (1,234 bytes), not exported.`, with no `text`.
- A failed call keeps its error in `_error`, and every entry its resource type in `_resourceType`.
- Response bodies that weren't captured, such as binary ones, keep the reason in `content.comment`, and a cut body says so there.

## Waterfall

The layout list in the toolbar switches between **List** and **Waterfall**.

- One bar per call, sorted by start time, then duration.
- **Color by status** or **Color by type** colors the bars by status or by resource type.
- A dot marks calls that a rule changed.
- **Zoom in** and **Zoom out** widen or narrow the chart 1.5 times per click, between 100% and 6400%, shown next to them; scroll sideways to pan.
  **Reset zoom** fits the whole chart again.
- The waterfall follows the content filter, the frame list and the search.
- Click a bar to inspect the call.

## Search

The search bar looks through every captured call of this tab, in the areas its **Search in** list picks; the panel opens with only `URL` checked.  
It always ignores case, and a match of empty text doesn't count, so a pattern such as `^` or `` alone finds nothing.

| Control     | Effect                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| Text        | What to find. The list and the waterfall keep only the calls that match. The `×` at its right end clears it. |
| Counter     | How many listed calls match, such as `7 matches` or `1 match`; `No matches` when none do. A regex that isn't valid shows its error here, in red. |
| `.*`        | Treat the text as a regular expression.                                     |
| Search in   | A list of the areas to search. It reads the first area checked and how many more, such as `URL` or `URL +2`. |

| Area               | Searches                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `URL`              | The URL without its query string: scheme, host, port and path, such as `https://api.example.com:8443/v1/users`. |
| `Query`            | The query string alone, as sent, such as `page=2&sort=name` from `/v1/users?page=2&sort=name`. |
| `Request Headers`  | Request header names and values, the `Cookie` header included.           |
| `Request Body`     | The request body as text; a compressed body is searched decompressed, and a binary body is skipped. |
| `Request Cookies`  | Cookie names and values from the request `Cookie` header.                |
| `Response Headers` | Response header names and values, the `Set-Cookie` headers included.     |
| `Response Body`    | The response body as text.                                               |
| `Response Cookies` | Cookie names and values from the response `Set-Cookie` headers, without their attributes. |

- The areas combine. Changing them searches again.
- One area always stays checked: unchecking the only checked one does nothing.
- With a side's headers and cookies both checked, a cookie match counts once.
- The search narrows what the content filter and the frame list keep, and the toolbar count shows the listed calls of all captured, such as `1 / 387`.
- An empty search box, or a regex that isn't valid, lists every call.
- Searching leaves the selection alone, as the content filter does: a selected call that doesn't match stays in the inspector.
- Calls captured during a search join the list once the search has looked through them.

While a search is active, a dot marks the inspector tabs that hold a match for the selected call: **General** for the URL and the query, the header tabs for headers and cookies, the body tabs for bodies.  
With `Request Body` or `Response Body` checked, that body tab shows the body as raw text with the matches highlighted; JSON is indented first, so a pattern that relies on the original spacing can mark a call without highlighting anything.  
Matches in the URL, the query, headers or cookies get the dot only.

## Pinned endpoints

The star on a row pins its endpoint: method plus URL without the query.  
Up to 3 pins sit in a shelf above the filters, each showing its latest call.  
Click a pin to select that call.

## Content filter

| Tab       | Keeps                                                                                    |
| --------- | ---------------------------------------------------------------------------------------- |
| All       | every captured call                                                                      |
| JSON      | a `json` request or response type                                                        |
| GraphQL   | a `/graphql` path, `application/graphql`, or a JSON body with a `query` string, or an array of them |
| Form Data | `multipart/form-data` or `application/x-www-form-urlencoded` requests                    |
| Document  | page navigations, calls of type `Document`: pages, form posts and iframe documents       |

**JSON**, **GraphQL** and **Form Data** go by content, and a call falls under one of them at most, checked in the order GraphQL, Form Data, JSON, so a form post that gets a JSON answer shows under **Form Data**.  
**Document** goes by type, so a form post shows under **Form Data** and **Document** alike, and an HTML page under **All** and **Document**.

## Inspector

The inspector has one tab per part of the call; the picked tab stays picked from call to call.

| Tab              | Shows                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| General          | **Mock this**, **Pin** (or **Unpin**) and **Copy URL**; URL, method, status with its reason phrase, type, start, duration, redirect and error; the rules that acted on the call |
| Request Headers  | the headers that went over the wire, then the `Cookie` header split into one row per cookie        |
| Request Body     | **Copy request body** and the body, or, for a binary body, **Copy as base64** and a hex view      |
| Response Headers | the headers the page got, then each `Set-Cookie` with its name, value, domain, path, expiry and flags |
| Response Body    | **Copy response body** and the body, or why it wasn't captured                                     |
| Code             | the call as a command or a script                                                                  |

- Values show in full and wrap, so any header or cookie value can be selected and copied by hand.
  A header with an empty value still gets its row.
- HTTP/2 answers carry no reason phrase, so the standard one is shown, such as `404 Not Found`.
- Response headers are the ones the page got, so all-tabs rules show in them, with `Set-Cookie` added back from the wire.
- Times show in UTC, as `2026-11-06T18:33:48Z`.
- A JSON object or array shows as a tree, with a **Tree** / **Raw** choice for its text; any other body, HTML included, shows as text with no choice.
  **Wrap** breaks long values onto new lines, in the tree and in the text; off, they scroll sideways.
  It is on by default.
- A value a rule added, updated or removed gets a **Modified** tag next to its name; hover the tag to see what it was before.
  A removed header shows `(removed)`, and a body a rule changed gets the tag above it.
- An `Authorization` header that holds a JWT gets an open icon that opens it in the [JWT](Jwt.md) tab.
- On a narrow panel the tabs wrap onto a second row.

**Request Body** shows the body as the page sent it, decoded:

- A body compressed with gzip or deflate, named by its `Content-Encoding` or recognized by its first bytes, is decompressed and shown as text, with a note such as `Decompressed from gzip (312 bytes → 1,024 bytes).`
- Any other binary body, such as an image sent as the whole body, shows `Binary body · N bytes` and a hex view of its first 4 KB; **Show all** shows the rest, and **Copy as base64** copies the bytes.
- Decompressed and binary bodies keep their first 1,048,576 bytes (1 MB), with a note when they are cut; a text body is kept whole.

**Code** turns the call into a command or a script.

- **Headers**, **Cookies**, **Query params** and **Body** are dropdowns, shown when the call has any.
  Each lists its items with **All** on top; untick the ones to leave out.
  Everything is ticked when the call opens, except `If-None-Match` and `If-Modified-Since`, which would make the server answer `304 Not Modified`.
- The command is the call as sent after rules, the same one **Open in HTTP Client** fills in.
- The command sits under **Show snippet**; changing the format folds it again.
- **Copy** puts it on the clipboard.

| Format          | Runs in                       | Notes                                                                                     |
| --------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| cURL (bash)     | bash, zsh, Git Bash           | Bodies with non-ASCII text go through `printf … \| curl --data-binary @-`, so the bytes stay exact. |
| cURL (cmd)      | Windows Command Prompt        | Starts with `chcp 65001` when a value is non-ASCII. Line breaks arrive as LF, so use bash or PowerShell for multipart bodies. |
| Wget            | bash with GNU Wget            | Prints the response to the terminal.                                                      |
| Fetch (browser) | the page's DevTools console   | Cookies come from the browser, with `credentials: "include"` when any cookie is ticked and `"omit"` otherwise; headers the browser forbids, such as `Cookie` or `User-Agent`, are left out, and `Referer` becomes the `referrer` option. |
| Fetch (Node.js) | Node.js 18+, as an ES module  | Sends cookies and every header as captured.                                               |
| PowerShell      | PowerShell 7, and 5.1         | One `& { … }` block that splats a `$parameters` table into `Invoke-WebRequest`, so a paste runs as one command. Cookies go in a `WebRequestSession`. Methods outside the standard set, such as `PROPFIND`, need PowerShell 7. |

Every format keeps the method, the full URL with its query, and the ticked headers, cookies, params and body, form bodies included.

- `Content-Length`, `Host`, `Connection`, `Keep-Alive`, `Proxy-Connection`, `Transfer-Encoding`, `Expect`, `TE`, `Upgrade` and HTTP/2 pseudo-headers are left out, and not offered under **Headers**; the tool sets its own.
- `Content-Encoding` is left out too, since the body is copied decoded, a decompressed body as its text.
- A captured `Accept-Encoding` becomes `--compressed` for cURL, and is left to the tool elsewhere, so responses print decoded.
- `GET` and `HEAD` bodies are left out of Fetch and PowerShell, which refuse them.
- A binary request body is left out, and **Body** isn't offered for it.

Text response bodies, HTML pages included, are captured and cut after 1,048,576 characters, with a note saying so; binary response bodies are skipped.
