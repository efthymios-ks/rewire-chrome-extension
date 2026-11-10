# Traffic

The Traffic tab lists the fetch and XHR calls of the active tab in the panel's window.  
A page loaded straight from the address bar joins them when it answers with data, such as JSON, XML or plain text.  
A tab that opens straight on such a URL, before the panel inspects it, needs one reload to show it.  
HTML pages, images, scripts and styles never enter the timeline.  
Requests sent from the [Client](Client.md) tab join the timeline of the inspected tab.

## Split view

The timeline sits on top and the inspector below.  
From 720 px wide they sit side by side.  
Drag the handle, or focus it and use the arrow keys; the ratio is remembered.  
The arrow button on the handle slides the inspector away, down or to the right, so the timeline gets the room; picking a call, clicking the button again or dragging the handle brings it back.

## Timeline

Each row shows method, status, path, host, content kind, a **Rules** badge when rules acted on it, and duration.  
Newest calls come first, up to 500 per tab.  
Switching tabs inspects the tab you switch to; the one you left is detached and its timeline cleared.  
Navigating keeps the timeline.  
When the debugger can't attach, as on `chrome://` pages, the panel tries again once the tab moves to another address.

- Hover **Rules** for the names of the rules that acted on the call.
- A redirect splits a call: the hop keeps its own row with the `3xx` answer, and the call goes on in a row for the new URL.
- A page from the address bar that a rule acted on keeps its redirect hops, and its failure when it fails, even when the page itself is HTML.
- Right-click a row, or the inspector, to **Open in Client** or to copy the call in any format of the **Code** tab, with its default parts.

## Toolbar

The first row holds the content filter chips and the call count.  
The second row holds the layout switch and **Clear**.

## Waterfall

The layout switch reads **List** when off and **Waterfall** when on.

- One bar per call, sorted by start time, then duration.
- Bars are colored by status or by resource type.
- A dot marks calls that a rule changed.
- **Zoom in** and **Zoom out** widen the chart; scroll sideways to pan.
  **Reset zoom** fits the whole chart again.
- The waterfall follows the content filter.
- Click a bar to inspect the call.

## Search

The search bar looks through the URL, request and response headers, and request and response bodies of every captured call of this tab.  
It always ignores case.

| Control     | Effect                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| Text        | What to find. Matching rows get a mark on the left.                         |
| Counter     | Which match is selected, such as `2 of 7`, or `No matches`.                 |
| `↑`, `↓`    | Select the previous or next match; `Shift+Enter` and `Enter` do the same.   |
| `.*`        | Treat the text as a regular expression.                                     |

While a search is active, the inspector shows bodies as raw text with the matches highlighted.

## Pinned endpoints

The star on a row pins its endpoint: method plus URL without the query.  
Up to 3 pins sit in a shelf above the filters, each showing its latest call.  
Click a pin to select that call.

## Content filter

| Tab       | Keeps                                                                                    |
| --------- | ---------------------------------------------------------------------------------------- |
| All       | every captured call                                                                      |
| JSON      | a `json` request or response type                                                        |
| GraphQL   | a `/graphql` path, `application/graphql`, or a JSON body with a `query` string           |
| Form Data | `multipart/form-data` or `application/x-www-form-urlencoded` requests                    |

## Inspector

**Inspect** shows, in order:

1. **General**: URL, method, status with its reason phrase, type, timing, redirect and error, plus the rules that acted on the call.
   HTTP/2 answers carry no reason phrase, so the standard one is shown, such as `404 Not Found`.
2. **Request headers**, with the `Cookie` header split into a table.
3. **Request body**.
4. **Response headers**, with each `Set-Cookie` parsed into name, value, domain, path, expiry and flags.
5. **Response body**.

- Sections start collapsed, and one opens at a time; opening another closes the one before.
  The open section stays open while the same call updates.
- Request headers are the ones that went over the wire, `Cookie` included.
  Response headers are the ones the page got, so all-tabs rules show in them, with `Set-Cookie` added back from the wire.
- Times show in UTC, as `2026-11-06T18:33:48Z`.
- JSON bodies show as a tree; switch to **Raw** for the text.
  **Wrap** breaks long values onto new lines, in the tree and in the text; off, they scroll sideways.
  It is on by default.
- Values a rule added, updated or removed are highlighted, name and value; hover one to see what it was before.
- An `Authorization` header that holds a JWT gets an open icon that opens it in the [JWT](Jwt.md) tab.
- Actions: **Mock this**, **Pin**, **Copy URL**, **Copy response body**.

**Code** turns the call into a command or a script.

- **Headers**, **Cookies**, **Query params** and **Body** are dropdowns, shown when the call has any.
  Each lists its items with **All** on top; untick the ones to leave out.
  Everything is ticked when the call opens, except `If-None-Match` and `If-Modified-Since`, which would make the server answer `304 Not Modified`.
- The command is the call as sent after rules, the same one **Open in Client** fills in.
- The command sits under **Show snippet**; changing the format folds it again.
- **Copy** puts it on the clipboard.

| Format          | Runs in                       | Notes                                                                                     |
| --------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| cURL (bash)     | bash, zsh, Git Bash           | Bodies with non-ASCII text go through `printf … \| curl --data-binary @-`, so the bytes stay exact. |
| cURL (cmd)      | Windows Command Prompt        | Starts with `chcp 65001` when a value is non-ASCII. Line breaks arrive as LF, so use bash or PowerShell for multipart bodies. |
| Wget            | bash with GNU Wget            | Prints the response to the terminal.                                                      |
| Fetch (browser) | the page's DevTools console   | Cookies come from the browser (`credentials: "include"`); headers the browser forbids, such as `Cookie` or `User-Agent`, are left out. |
| Fetch (Node.js) | Node.js 18+, as an ES module  | Sends cookies and every header as captured.                                               |
| PowerShell      | PowerShell 7, and 5.1         | One `& { … }` block that splats a `$parameters` table into `Invoke-WebRequest`, so a paste runs as one command. Cookies go in a `WebRequestSession`. Methods outside the standard set, such as `PROPFIND`, need PowerShell 7. |

Every format keeps the method, the full URL with its query, and the ticked headers, cookies, params and body, form bodies included.

- `Content-Length`, `Host`, `Connection` and HTTP/2 pseudo-headers are left out; the tool sets its own.
- A captured `Accept-Encoding` becomes `--compressed` for cURL, and is left to the tool elsewhere, so responses print decoded.
- `GET` and `HEAD` bodies are left out of Fetch and PowerShell, which refuse them.
- Binary bodies, such as file uploads, are not captured, so they can't be copied byte for byte.

Text bodies are captured and cut after 1,048,576 characters; binary bodies are skipped.
