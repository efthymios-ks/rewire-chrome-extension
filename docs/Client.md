# Client

The **Client** tab sends a request from the panel and shows the answer.

- Pick the method, type the URL, add headers and a body, then **Send**.
- The request leaves from the panel, not the page, so inspected-tab rules don't act on it.
- Headers the browser forbids in `fetch`, such as `Cookie` or `Host`, are dropped.

## Fill it in

- Paste a cURL (bash or cmd) or Wget command into the URL field, and the method, URL, headers, body type and body fill in.
  Single-line and multi-line commands work, with `\`, `^` or `` ` `` line continuations, bare line breaks or Windows line endings.
- Right-click a call in the Traffic timeline or inspector and pick **Open in Client** to fill it from that call, as sent after rules.
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
- `GET` and `HEAD` send no body.
- Files are sent as they are, never read as text.

## Answer

The answer shows its status with the reason phrase, and how long it took.

- **Body** shows the response text, indented when it is JSON.
- **Headers** lists the response headers.
- A request that never got an answer, such as a refused connection, shows the browser's error instead.

Each request, answered or failed, joins the [Traffic](Traffic.md) timeline of the inspected tab, so the inspector, search and **Code** tab work on it too.  
Files show there as their name and size, not their contents.
