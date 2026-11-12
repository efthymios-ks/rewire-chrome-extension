# Rule catalog

Every rule type, grouped as in the **Add rule** catalog.  
**Works on** is where the type works with plain URL conditions; some conditions and operations need the inspected tab, see [Rules](Rules.md).

## Headers

| Type            | What it does                                                               | Works on   |
| --------------- | -------------------------------------------------------------------------- | ---------- |
| Request header  | Add, update or remove request headers.                                     | `All tabs` |
| Response header | Add, update or remove response headers.                                    | `All tabs` |
| CORS            | Rewrite `Access-Control-*` response headers; answer preflights with `204`. | `All tabs` |
| Security header | Set HSTS, CSP, Permissions-Policy and other headers from a preset.         | `All tabs` |

- Chrome's request rules can **Add** only some request headers, such as `Accept`, `Cookie` or `User-Agent`; **Add** on others works on the inspected tab.
- **Add if missing** works on the inspected tab.
- A token goes in a **Request header** rule, such as `Authorization` with `Bearer <token>`.
  Exports blank it unless **Include cookie values and auth headers** is ticked.
- A specific **Allowed origin** in **CORS** also allows credentials; `*` does not.
- Chrome hands CORS preflights to the debugger as XHR requests.
  On the inspected tab, **CORS** answers them itself with `204` when **Answer OPTIONS preflights** is on.
  On other tabs, Chrome's request rules add the headers to the server's own preflight answer.

## Cookies

| Type            | What it does                                                                                     | Works on        |
| --------------- | ------------------------------------------------------------------------------------------------ | --------------- |
| Request cookie  | Add, update or remove one cookie in the `Cookie` header.                                         | `Inspected tab` |
| Response cookie | Add, update or remove a `Set-Cookie`, with domain, path, Max-Age, SameSite, Secure and HttpOnly. | `Inspected tab` |

**Add or update** on a response cookie keeps the attributes left empty from the `Set-Cookie` already there.

## URL, query and redirects

| Type          | What it does                                                                   | Works on        |
| ------------- | ------------------------------------------------------------------------------ | --------------- |
| Rewrite       | Silently send matching requests to another URL.                                | `All tabs`      |
| Redirect      | Answer with a redirect status and a `Location` header; the browser follows it. | `Inspected tab` |
| Query params  | Add, update or remove query string params.                                     | `All tabs`      |
| HTTP to HTTPS | Upgrade `http` requests to `https`.                                            | `All tabs`      |

**Rewrite** and **Redirect**:

- **To URL** (Rewrite) or **Location URL** (Redirect) is where the request goes.
- `$1` to `$9` insert the groups of a URL condition that **matches regex**; `$0` is the whole URL, `$$` a `$`.
  A request missing a group it uses passes through untouched.
- A **Rewrite** with groups works on all tabs only when that regex is its one URL condition.
  Next to another URL, path, extension, host or query condition, it works on the inspected tab.
- **Redirect** answers with **Status** `301`, `302`, `303`, `307` or `308`, the default.

```
Condition  URL matches regex ^https://api\.example\.com/users/(\d+)$
To URL     http://localhost:5000/users/$1
Request    https://api.example.com/users/42
Goes to    http://localhost:5000/users/42
```

**Query params**: wildcard keys, **Add** and **Add if missing** work on the inspected tab.

## Mocks and responses

| Type          | What it does                                                                      | Works on        |
| ------------- | --------------------------------------------------------------------------------- | --------------- |
| Mock response | Answer with your own status, body or both. With both, the server is never called. | `Inspected tab` |
| Latency       | Hold matching requests for up to 10 seconds before they go out.                   | `Inspected tab` |
| Request body  | Replace the request body, merge a JSON patch into it, or find and replace in it.  | `Inspected tab` |
| Response body | Replace the response body, merge a JSON patch into it, or find and replace in it. | `Inspected tab` |

**Mock response**:

- **Override the status** and **Override the body** each switch on one part.
  With only one on, the server answers and the rule changes that part of its answer.
  With a response condition, the rule waits for the server and changes its answer even with both on.
- **Content type** takes free text and suggests the common media types.
- It answers the CORS preflight of a call it mocks with `204`, allowing the requested method and headers, so cross-origin mocks need no **CORS** rule.
- To block a request, mock it, for example with status `403`.

**Request body** and **Response body** are twins, with the same fields:

- **Mode**: **Replace the body**, **Merge a JSON patch** (RFC 7386, `null` removes a key), or **Find and replace**.
- **Replace the body** can also set the **Content type**; empty keeps the one there.
- **Find and replace** finds as **Text** or **Regex**; with **Regex**, `$1` in **Replace with** inserts a group.
- Without a body, only **Replace the body** acts.

**Response body** with **Replace the body** edits what the server sent; **Mock response** with only **Override the body** gives the same answer.

Preflight `OPTIONS` requests skip **Latency**, so CORS checks still pass in time.

## Logic

| Type         | What it does                                                                                           | Works on        |
| ------------ | ------------------------------------------------------------------------------------------------------ | --------------- |
| Set variable | Capture a value from the URL, a header, a cookie or the body, and use it as `{{name}}` in other rules. | `Inspected tab` |

**Set variable**:

- **From**: the URL, a query parameter, a request header or cookie, a response header, or the request or response body.
- **Name** picks the parameter, header or cookie.
- **Regex (optional)** keeps its first group, or the whole match.
- Bodies are read with a **Path**, JSONPath for JSON and XPath for XML.
  Objects and arrays come out as JSON text.
- A source or path that finds nothing leaves the variable as it was.

| Path     | Supports                                                                                                               | Example                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| JSONPath | `$`, `.name`, `['name']`, `[0]`, `[-1]` from the end, `.length` of an array or text                                    | `$.items[0].id`                |
| XPath    | `/` child, `//` any depth, `*`, `[1]` (`[-1]` is the last), `[@name='value']`, `@name`, `text()`; the first match wins | `//item[@kind='primary']/@sku` |

Captured values live until the browser restarts, and win over the ones typed in [Variables](Rules.md#variables).  
All-tabs rules that use a variable resync when it changes.
