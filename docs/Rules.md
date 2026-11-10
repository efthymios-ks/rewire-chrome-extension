# Rules

Every change the panel makes to traffic is a rule.  
A rule is **if** some conditions match, **then** do one action.  
Rules sit in one ordered list, and the Rules tab edits that list.

## Where rules work

The panel picks, for each rule, where it can work, and shows it as a badge:

| Badge           | Works on                                                  | Built on                                 |
| --------------- | --------------------------------------------------------- | ---------------------------------------- |
| `All tabs`      | every tab, panel open or not                              | `declarativeNetRequest` dynamic rules    |
| `Inspected tab` | the tab the panel inspects                                | `chrome.debugger`, Fetch domain          |
| `Invalid`       | nowhere; the editor lists what to fix                     |                                          |

A rule works on all tabs when Chrome's request rules can express it, and on the inspected tab otherwise.  
CORS works on all tabs and answers preflights on the inspected tab.  
The badge's tooltip, and the line next to it in the editor, say why a rule works on the inspected tab only.

Order:

- Rules run top to bottom.
  Each rule sees the request as the rules above it left it, so for the same header the lower rule wins.
- All-tabs rules act before inspected-tab rules.
- Every matching rule runs, not only the first.
  When a rule answers a request itself, such as a **Mock response**, the rules that act on responses run on its answer, top to bottom, on either kind of tab.
- Dragging a row, or focusing its handle and pressing the up and down arrows, changes the order.

Conditions that only work on the inspected tab:

| Condition                                   | All tabs | Note                                         |
| ------------------------------------------- | -------- | -------------------------------------------- |
| URL, host, method, path, extension, query   | yes      | a negated condition, a path regex, or a query value with `*`, `?` or a regex needs the inspected tab |
| Resource type                               | yes      | no type means Fetch, XHR and documents, such as an API URL opened in the address bar; Fetch and XHR each match both, as Chrome doesn't tell them apart |
| Request header, request cookie              | no       |                                              |
| Response status, header, content type       | no       | only for types that act on the response      |
| Sample (percent of requests)                | no       |                                              |
| Time window                                 | yes      | checked when rules sync, every minute        |

Match **all** or **any** of the conditions.  
Each condition can be negated with **is not**.  
No conditions means every request.

## Wildcards and regex

A text condition matches with **matches wildcard** or **matches regex**.  
Names can also be checked with **exists**, hosts with **is in domains**, and methods, extensions and resource types with **is one of**.

| Wildcard character | Matches                                 |
| ------------------ | --------------------------------------- |
| `*`                | zero or more characters, any of them    |
| `?`                | exactly one character                   |
| `\`                | escapes the next `*`, `?` or `\`        |

- A wildcard covers the whole value, from the first character to the last.
  Without `*` or `?` it is an exact match, and `*text*` is a contains.
- Wildcards are turned into a regex, so both sides run the same pattern.
- Regexes use RE2 syntax, which is what Chrome's request rules accept.
- Capture groups need a regex: **Rewrite** and **Redirect** take `$1` to `$9` from a URL condition that **matches regex**.

Example, URL **matches wildcard** `http*google.com*users*58`:

| URL                                              | Matches | Why                                    |
| ------------------------------------------------ | ------- | -------------------------------------- |
| `https://google.com/users/58`                    | yes     |                                        |
| `https://mail.google.com/v2/accounts/users/58`   | yes     | `*` spans the subdomain and the path   |
| `https://google.com/users/158`                   | yes     | the `*` before `58` takes the `1`      |
| `https://google.com/users/58?page=1`             | no      | the URL must end with `58`, query included |
| `https://notgoogle.com/users/58`                 | yes     | the first `*` takes `s://not`          |

`https://*google.com/*users/58*` keeps the scheme to https and lets a query follow.

## Add, Add if missing, Add or update, Remove

Request headers, response headers, request cookies, response cookies and query params share four operations:

| Operation       | Effect                                              | Works on                                     |
| --------------- | --------------------------------------------------- | -------------------------------------------- |
| Add             | adds the value; one already there stays             | all tabs for response headers and standard request headers, the inspected tab otherwise |
| Add if missing  | adds the value only when none is there              | the inspected tab                            |
| Add or update   | sets the value, replacing one already there         | all tabs for headers and query params        |
| Remove          | removes it; query param keys can use wildcards      | all tabs for headers and exact query keys    |

Cookie rules work on the inspected tab.

## Rules tab

Each row shows: drag handle, on/off switch, name, type, where it works, hit count, and a one-line summary of its conditions.

- **Edit**, **Duplicate** and **Remove**.
  **Remove** asks first, and the notice after it can undo it for 8 seconds.
- The toolbar's first row holds **Add rule** and the search box, which searches names only.
  The second row holds **Test rules** and **Import / export**.
- The header switch turns every rule off at once; capture keeps running.
- Hit counts start at zero with the browser.
  Inspected-tab rules count exactly.
  All-tabs rules count while a panel is open.

## Add or edit a rule

**Add rule** opens a slide-over with the catalog, grouped and searchable; see [Rule catalog](RuleCatalog.md).  
Picking a type opens the editor:

- **Name** and **Enabled**.
- **If**: the conditions.
- **Then**: the type's fields.
- Where the rule works, and any errors, live.
- **Test this rule**, collapsed until opened: a sample request and an optional sample response, run through this rule only.
  It shows each condition with its value, the changes the rule makes, and where the request ends up.

A new rule, or a row added to it, starts blank; editing a rule keeps what it holds.  
Content type fields take free text and suggest the common media types, the ones .NET lists in `MediaTypeNames`.  
Header name fields do the same with the header names ASP.NET Core lists in `HeaderNames`.  
Header value fields suggest values for the header named next to them, such as media types for `Content-Type` and `Accept`, and nothing for a header without known values.  
Suggestions appear as you type, with no dropdown arrow: arrow keys and **Enter** pick one, **Escape** closes the list.  
Text fields marked so can use `{{name}}` variables, set by a **Set variable** rule.

Shortcuts that open the editor already filled in:

- **Mock this** on a request in the inspector.
- **Make rule** on a cookie in the Cookie Jar.

To send a `User-Agent`, `X-Forwarded-For` or `CF-IPCountry` value, add a **Request header** rule.

## Test every rule

**Test rules** runs one sample request through every enabled rule, all-tabs rules first.  
It shows the same report as the editor's tester.

## Import and export

**Import / export** in the toolbar:

- **Copy JSON** puts every rule on the clipboard, and **Download JSON** saves them to a file, as `schemaVersion` 4.
  `Authorization`, `Cookie`, API key headers and cookie values are blanked unless **Include cookie values and auth headers** is ticked.
- **Choose file** reads a JSON export and shows how many rules it holds before importing.
  **Merge** adds new rules and replaces rules with the same id.
  **Replace** swaps every rule.
  `schemaVersion` 2 and 3 files are converted as described under [Upgrading](#upgrading).
  Other versions, or unknown rule types, are refused.

```json
{
  "schemaVersion": 4,
  "rules": [
    {
      "id": "6c1f0a52-0b7e-4b0e-9a55-2f4f5c2f7d10",
      "name": "Users mock",
      "enabled": true,
      "type": "mockResponse",
      "criteria": {
        "match": "all",
        "items": [
          {
            "field": "url",
            "op": "wildcard",
            "name": "",
            "value": "*/api/v1/users/*",
            "negate": false
          }
        ]
      },
      "action": {
        "overrideStatus": true,
        "status": 200,
        "overrideBody": true,
        "contentType": "application/json",
        "headers": [],
        "body": "{\"id\":42}"
      }
    }
  ]
}
```

## Upgrading

Older settings are converted once, on first load, and the old keys are removed.

From `schemaVersion` 3:

- **Redirect** with status **Default** becomes **Rewrite**; a redirect with a status stays **Redirect**.
- **Environment mirror** becomes **Rewrite**: its source base URL becomes a URL condition that matches regex, and `$1` carries the path and query over to the target base URL.

From `schemaVersion` 2:

- Profiles are gone: the active profile's rules stay as they were, and the other profiles' rules are kept switched off.
- **Regex redirect** becomes **Rewrite** and **Redirect with status** becomes **Redirect**; a regex redirect's regex becomes a URL condition that matches regex.
- **Add or replace query params** and **Remove query params** become **Query params**.
- **Status override** becomes a **Mock response** that overrides the status only.
- **Auth token** becomes a **Request header** rule.
- `set`, `append` and the cookie **Change** operation become **Add or update**, **Add** and **Add or update**.
- **equals** and **contains** conditions become wildcards, and **is under base URL** a regex.
- A latency on any other rule becomes a **Latency** rule right above it, with the same conditions.
- Device, client IP and country conditions are removed, and their rules switched off.
- **Request body modify** and **Response body find & replace** become **Request body** and **Response body**, with the same modes.
- Rule types that no longer exist are dropped: Header find & replace, Request ID, Bulk redirects, Failover response, Network failure, Block request, Phased release, A/B segment and Load balancer.

From the settings before the Rules tab:

- Mocks become **Mock response** rules, with a **Latency** rule for any delay.
- Redirects and mirrors become **Rewrite** rules; a mirror's base URL becomes a URL condition that matches regex.
- Injected headers become **Request header** rules.
- The CORS switch becomes a **CORS** rule.
