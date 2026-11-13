# HTTP Client

The **HTTP Client** tab sends a request from the panel and shows the answer.

- Pick the method, type the URL, add headers and a body, then **Send**.
- The request leaves from the panel, not the page, so inspected-tab rules don't act on it.
- Most requests go out with the panel's own `fetch`.
  A body on `GET` or `HEAD`, or a `Cookie`, `Origin`, `Referer` or `User-Agent` header, which `fetch` refuses or drops, goes out through the debugger instead, exactly as typed, the way Postman or cURL would send it.
  The debugger attaches to the side panel for that, so Chrome's "started debugging this browser" bar shows.
- Other headers the browser controls, such as `Host` or `Content-Length`, are set by the browser.

## Fill it in

- Paste a cURL (bash or cmd) or Wget command into the URL field, and the method, URL, headers, body type and body fill in.
  Single-line and multi-line commands work, with `\`, `^` or `` ` `` line continuations, bare line breaks or Windows line endings.
- Right-click a call in the Traffic timeline or inspector and pick **Open in HTTP Client** to fill it from that call, as sent after rules.
- Files a command names can't be read by the browser, so their fields come empty with a **Pick** hint; pick each file before sending.

## Headers

Each header is one row: name, value, and a remove button, on one line at any width.

- Name and value suggest as you type: arrow keys and **Enter** pick a suggestion, **Escape** closes the list.
- Names come from .NET `HeaderNames`.
- Values follow the name next to them: `Content-Type` and `Accept` suggest the .NET `MediaTypeNames`, `Accept-Encoding` the encodings, `Cache-Control` the common directives; a header without known values suggests nothing.

## Body

Tabs pick the body type.

| Type             | Editor                                    | Content-Type sent                                          |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------- |
| None             | no body                                   | none                                                       |
| Text             | a text box                                | `text/plain`                                               |
| JSON             | a text box with **Format**                | `application/json`                                         |
| XML              | a text box with **Format**                | `application/xml`                                          |
| Form URL-encoded | name and value rows                       | `application/x-www-form-urlencoded`                        |
| Multipart form   | name rows that hold text or a file        | `multipart/form-data`, with the boundary the browser picks |
| Binary           | one file                                  | the file's own type, or `application/octet-stream`         |
| GraphQL          | one query box, sent as `{"query": "..."}` | `application/json`                                         |

- A `Content-Type` header you add yourself wins over the one the body type sets.
- `GET` and `HEAD` send their body too, through the debugger.
- Files are sent as they are, never read as text.

## Copy as

**Copy as**, next to **Send**, copies the request in the form as a command or a script, in the same formats as the Traffic menu: cURL (bash), cURL (cmd), Wget, Fetch (browser), Fetch (Node.js) and PowerShell.

- The copy holds the method, the URL, every header typed, `If-None-Match` and `If-Modified-Since` included, and the body.
- The body type's `Content-Type` is added unless a `Content-Type` header is typed, as when sending.
- A multipart form copies its text fields and its files by name, such as `-F 'photo=@photo.png;type=image/png'`; a binary body copies its file by name, such as `--data-binary '@payload.bin'`.
  Each file must sit next to where the command runs.
- A body on `GET` or `HEAD` is copied too, except by Fetch and PowerShell, which refuse it.
- [Traffic](Traffic.md#inspector) describes what each format runs in.
- With no URL, a notice asks for one.

## Answer

The answer shows its status with the reason phrase, and how long it took.

- **Body** shows the response text, indented when it is JSON.
- **Headers** lists the response headers.
- A request that never got an answer, such as a refused connection, shows the browser's error instead.

Each request, answered or failed, joins the [Traffic](Traffic.md) timeline of the inspected tab, so the inspector, search and **Code** tab work on it too.  
Files show there as their name and size, not their contents.
