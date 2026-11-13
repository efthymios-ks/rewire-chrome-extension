# Rule JSON

Every rule, condition and profile as JSON, the way **Import / export** in the Rules tab reads and writes it.  
Use it to write rules by hand, or hand it to an assistant together with what you want, and import the JSON it answers with.  
[Rules](Rules.md) explains how rules run and in what order, and [Rule catalog](RuleCatalog.md) what each type does on a page.

## File

An import file holds one or more profiles, each with its rules and variables.

```json
{
  "schemaVersion": 5,
  "profiles": [
    {
      "id": "orders-mocks",
      "name": "Orders mocks",
      "rules": [],
      "variables": []
    }
  ]
}
```

| Key             | Type   | Meaning                                                                 |
| --------------- | ------ | ----------------------------------------------------------------------- |
| `schemaVersion` | number | Always `5`.                                                              |
| `profiles`      | array  | The profiles; a file with none is refused.                              |

Each profile:

| Key         | Type   | Meaning                                                                                  |
| ----------- | ------ | ---------------------------------------------------------------------------------------- |
| `id`        | string | Any unique text. Missing, a random id is given. The first profile of every install is `default`. |
| `name`      | string | Shown in the profile list. Empty becomes `Unnamed profile`.                               |
| `rules`     | array  | The rules, in the order they run, top to bottom.                                         |
| `variables` | array  | `{ "name": "...", "value": "..." }` pairs, see [Variables](#variables).                  |

Import, in the Rules tab under **Import / export**, offers two modes:

- **Merge** adds new profiles and patches a profile with the same `id`: rules with the same `id` are replaced, new ones added.
- **Replace** deletes every profile and keeps only the imported ones.

A new profile `id`, such as `orders-mocks`, keeps imported rules apart from yours.  
A rule type that isn't listed under [Rule types](#rule-types) makes the whole file fail.

## Rule

```json
{
  "id": "orders-500",
  "name": "Orders fail with 500",
  "enabled": true,
  "type": "mockResponse",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "url",
        "op": "wildcard",
        "name": "",
        "value": "*/api/v1/orders*",
        "negate": false
      }
    ]
  },
  "action": {
    "overrideStatus": true,
    "status": 500,
    "overrideBody": true,
    "contentType": "application/json",
    "headers": [],
    "body": "{\"error\":\"Server error\"}"
  }
}
```

| Key        | Type    | Meaning                                                                     |
| ---------- | ------- | --------------------------------------------------------------------------- |
| `id`       | string  | Unique within the profile. Missing, a random id is given.                   |
| `name`     | string  | Shown in the Rules tab.                                                     |
| `enabled`  | boolean | Missing means `true`.                                                       |
| `type`     | string  | One of the type ids under [Rule types](#rule-types).                        |
| `criteria` | object  | When the rule acts, see [Conditions](#conditions).                          |
| `action`   | object  | What the rule does; its keys depend on `type`.                              |

- A key an action doesn't know is ignored; a key it needs and doesn't find takes its default.
- A rule with an empty required value, such as a header with no name, imports, but shows as `Invalid` and does nothing until fixed.

## Conditions

```json
{
  "match": "all",
  "items": [
    {
      "field": "host",
      "op": "domains",
      "name": "",
      "value": "api.example.com",
      "negate": false
    },
    {
      "field": "method",
      "op": "oneOf",
      "name": "",
      "value": "POST, PUT",
      "negate": false
    }
  ]
}
```

| Key     | Type   | Meaning                                                    |
| ------- | ------ | ---------------------------------------------------------- |
| `match` | string | `all` or `any` of the items. Anything else means `all`.    |
| `items` | array  | The conditions. None means every request.                  |

Each condition:

| Key      | Type    | Meaning                                                                       |
| -------- | ------- | ----------------------------------------------------------------------------- |
| `field`  | string  | What to check, see the table below.                                           |
| `op`     | string  | How to check it, one of the field's operators.                                |
| `name`   | string  | The query parameter, header or cookie name; `""` for other fields.            |
| `value`  | string  | What to compare with; `""` for `exists`. Always a string, even for numbers.   |
| `negate` | boolean | `true` turns the condition into **is not**.                                   |

A value that isn't a string, such as `10` instead of `"10"`, is read as empty.

### Fields

| `field`          | Checks                                      | `op`                            | `name`  | Example `value`         | All tabs |
| ---------------- | ------------------------------------------- | ------------------------------- | ------- | ----------------------- | -------- |
| `url`            | the whole URL, query included               | `wildcard`, `regex`             | no      | `*/api/v1/users/*`      | yes      |
| `host`           | the host name                               | `domains`, `wildcard`           | no      | `api.example.com`       | yes      |
| `method`         | the HTTP method                             | `oneOf`                         | no      | `GET, POST`             | yes      |
| `path`           | the path, without the query                 | `wildcard`, `regex`             | no      | `/api/v1/users/*`       | yes, `wildcard` only |
| `extension`      | the file extension of the path              | `oneOf`                         | no      | `js, css`               | yes      |
| `query`          | one query parameter                         | `exists`, `wildcard`, `regex`   | yes     | `2`                     | yes, `exists` or a value without `*`, `?` or regex |
| `requestHeader`  | one request header                          | `exists`, `wildcard`, `regex`   | yes     | `Bearer *`              | no       |
| `requestCookie`  | one cookie of the request                   | `exists`, `wildcard`, `regex`   | yes     | `beta`                  | no       |
| `resourceType`   | the kind of request                         | `oneOf`                         | no      | `fetch, xhr`            | yes      |
| `responseStatus` | the response status                         | `range`                         | no      | `404, 5xx`              | no       |
| `responseHeader` | one response header                         | `exists`, `wildcard`, `regex`   | yes     | `no-cache`              | no       |
| `contentType`    | the response `Content-Type`                 | `wildcard`, `regex`             | no      | `*json*`                | no       |
| `sample`         | a random share of the requests              | `percent`                       | no      | `10`                    | no       |
| `timeWindow`     | the local time of day                       | `between`                       | no      | `09:00-17:30`           | yes      |

- A negated condition works on the inspected tab only, except `host` with `domains`, `method` and `resourceType`.
- Response conditions, `responseStatus`, `responseHeader` and `contentType`, only make sense on types that act on the response.
- With no `resourceType` condition, a rule acts on Fetch, XHR and documents, such as an API URL opened in the address bar.

### Operators

| `op`       | Label                      | `value`                                                                                       |
| ---------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| `wildcard` | matches wildcard           | The whole value must match. `*` is any text, `?` one character, `\` escapes the next one. `*text*` means contains. |
| `regex`    | matches regex              | An RE2 regular expression, the syntax Chrome's request rules accept.                          |
| `domains`  | is in domains              | Host names, split by commas or spaces. A domain also matches its subdomains.                  |
| `oneOf`    | is one of                  | Values, split by commas or spaces, ignoring case.                                             |
| `exists`   | exists                     | `""`; the named parameter, header or cookie is there.                                         |
| `range`    | is in range                | Statuses, split by commas: `404`, `4xx`, `400-499`.                                           |
| `percent`  | falls in the first percent | `0` to `100`; each request is picked at random.                                               |
| `between`  | is between                 | `HH:MM-HH:MM` in local time; a window that ends earlier than it starts runs past midnight.    |

`resourceType` values:

| Value        | Matches                                       |
| ------------ | --------------------------------------------- |
| `fetch`      | `fetch()` and XMLHttpRequest calls            |
| `xhr`        | the same; Chrome doesn't tell them apart      |
| `document`   | pages and iframes                             |
| `script`     | scripts                                       |
| `stylesheet` | stylesheets                                   |
| `image`      | images                                        |
| `font`       | fonts                                         |
| `media`      | audio and video                               |
| `websocket`  | WebSocket handshakes                          |
| `ping`       | beacons and pings                             |
| `other`      | anything else                                 |

### Capture groups

A `url` condition with `regex` feeds `$1` to `$9` into the `target` of **Rewrite** and **Redirect**.  
`$0` is the whole URL and `$$` is a `$`.

```json
{
  "field": "url",
  "op": "regex",
  "name": "",
  "value": "^https://api\\.example\\.com/(.*)$",
  "negate": false
}
```

## Variables

Text marked **Can use `{{variables}}`** below takes `{{name}}`, filled in from the active profile when the rule runs.

```json
{
  "variables": [
    {
      "name": "token",
      "value": "eyJhbGciOi..."
    },
    {
      "name": "apiHost",
      "value": "localhost:5000"
    }
  ]
}
```

- Names start with a letter or `_` and use letters, digits, `_`, `.` and `-`.
- A value captured by a **Set variable** rule wins over the one in the profile, until the browser restarts.
- A `{{name}}` with no value stays as written.

## Operations

**Request header**, **Response header** and **Query params** take a list of operations; the cookie types take one.

```json
{
  "op": "addOrUpdate",
  "name": "X-Debug",
  "value": "1"
}
```

| `op`           | Label          | Effect                                              |
| -------------- | -------------- | --------------------------------------------------- |
| `add`          | Add            | Adds the value; one already there stays.            |
| `addIfMissing` | Add if missing | Adds the value only when none is there.             |
| `addOrUpdate`  | Add or update  | Sets the value, replacing one already there.        |
| `remove`       | Remove         | Removes it; `value` is ignored.                     |

[Rules](Rules.md#add-add-if-missing-add-or-update-remove) lists which operations work on all tabs.

## Rule types

| `type`                | Label           | Group                  | Works on                                  |
| --------------------- | --------------- | ---------------------- | ----------------------------------------- |
| `requestHeader`       | Request header  | Headers                | All tabs                                  |
| `responseHeader`      | Response header | Headers                | All tabs                                  |
| `cors`                | CORS            | Headers                | All tabs; preflights on the inspected tab |
| `securityHeaders`     | Security header | Headers                | All tabs                                  |
| `allowEmbedding`      | Allow embedding | Headers                | Inspected tab, or all tabs with `keepCsp` off |
| `requestCookie`       | Request cookie  | Cookies                | Inspected tab                             |
| `responseCookie`      | Response cookie | Cookies                | Inspected tab                             |
| `redirect`            | Redirect        | URL, query & redirects | Inspected tab                             |
| `rewrite`             | Rewrite         | URL, query & redirects | All tabs                                  |
| `queryParams`         | Query params    | URL, query & redirects | All tabs                                  |
| `upgradeScheme`       | HTTP to HTTPS   | URL, query & redirects | All tabs                                  |
| `mockResponse`        | Mock response   | Mocks & responses      | Inspected tab                             |
| `delay`               | Latency         | Mocks & responses      | Inspected tab                             |
| `requestBodyModify`   | Request body    | Mocks & responses      | Inspected tab                             |
| `responseBodyReplace` | Response body   | Mocks & responses      | Inspected tab                             |
| `setVariable`         | Set variable    | Logic                  | Inspected tab                             |

**Works on** is for plain URL conditions; a condition or operation from the inspected-tab lists in [Rules](Rules.md#where-rules-work) moves the rule to the inspected tab.

### Request header

`requestHeader` adds, updates or removes request headers.

| Key          | Type  | Values                                                           | Default                                         |
| ------------ | ----- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `operations` | array | [Operations](#operations); `name` is the header, `value` can use `{{variables}}` | one `addOrUpdate` with an empty name and value |

- At least one operation is needed, and every header name must be valid.
- **Add** on a header Chrome's request rules don't take, and **Add if missing**, work on the inspected tab only.

```json
{
  "id": "auth-header",
  "name": "Send the staging token",
  "enabled": true,
  "type": "requestHeader",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "host",
        "op": "domains",
        "name": "",
        "value": "api.example.com",
        "negate": false
      }
    ]
  },
  "action": {
    "operations": [
      {
        "op": "addOrUpdate",
        "name": "Authorization",
        "value": "Bearer {{token}}"
      },
      {
        "op": "remove",
        "name": "X-Client-Version",
        "value": ""
      }
    ]
  }
}
```

### Response header

`responseHeader` adds, updates or removes response headers.  
It takes the same `operations` as **Request header**.

```json
{
  "id": "no-cache",
  "name": "Turn off caching",
  "enabled": true,
  "type": "responseHeader",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "url",
        "op": "wildcard",
        "name": "",
        "value": "*/api/*",
        "negate": false
      }
    ]
  },
  "action": {
    "operations": [
      {
        "op": "addOrUpdate",
        "name": "Cache-Control",
        "value": "no-store"
      }
    ]
  }
}
```

### CORS

`cors` rewrites the `Access-Control-*` response headers and can answer preflights.

| Key               | Type    | Values                                                                 | Default                                         |
| ----------------- | ------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `allowedOrigin`   | string  | An origin such as `http://localhost:3000`; empty allows any origin. A specific origin also allows credentials. | `""` |
| `allowedMethods`  | string  | Methods split by commas; empty sends the default.                     | `GET, POST, PUT, PATCH, DELETE, OPTIONS`        |
| `allowedHeaders`  | string  | Headers split by commas; empty sends the default.                     | `Authorization, Content-Type, X-Requested-With` |
| `answerPreflight` | boolean | `true` answers `OPTIONS` preflights with `204` on the inspected tab.  | `true`                                          |

```json
{
  "id": "cors-local",
  "name": "Allow the local frontend",
  "enabled": true,
  "type": "cors",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "host",
        "op": "domains",
        "name": "",
        "value": "api.example.com",
        "negate": false
      }
    ]
  },
  "action": {
    "allowedOrigin": "http://localhost:3000",
    "allowedMethods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "allowedHeaders": "Authorization, Content-Type",
    "answerPreflight": true
  }
}
```

### Security header

`securityHeaders` sets one security header from a preset.

| Key      | Type   | Values                                          | Default |
| -------- | ------ | ----------------------------------------------- | ------- |
| `preset` | string | One of the presets below.                       | `hsts`  |
| `value`  | string | The header value; empty uses the preset's value. | `""`    |

| `preset`             | Header                      | Preset value                                 |
| -------------------- | --------------------------- | -------------------------------------------- |
| `hsts`               | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`        |
| `csp`                | `Content-Security-Policy`   | `default-src 'self'`                         |
| `permissionsPolicy`  | `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`   |
| `contentTypeOptions` | `X-Content-Type-Options`    | `nosniff`                                    |
| `frameOptions`       | `X-Frame-Options`           | `DENY`                                       |
| `referrerPolicy`     | `Referrer-Policy`           | `strict-origin-when-cross-origin`            |

```json
{
  "id": "strict-csp",
  "name": "Strict CSP",
  "enabled": true,
  "type": "securityHeaders",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "resourceType",
        "op": "oneOf",
        "name": "",
        "value": "document",
        "negate": false
      }
    ]
  },
  "action": {
    "preset": "csp",
    "value": "default-src 'self'; img-src *"
  }
}
```

### Allow embedding

`allowEmbedding` removes `X-Frame-Options` and the CSP `frame-ancestors` directive, so the page loads in an iframe.

| Key       | Type    | Values                                                                                                | Default |
| --------- | ------- | ----------------------------------------------------------------------------------------------------- | ------- |
| `keepCsp` | boolean | `true` cuts only `frame-ancestors`, on the inspected tab. `false` removes the whole `Content-Security-Policy`, on every tab. | `true`  |

```json
{
  "id": "embed-app",
  "name": "Let the app load in an iframe",
  "enabled": true,
  "type": "allowEmbedding",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "host",
        "op": "domains",
        "name": "",
        "value": "app.example.com",
        "negate": false
      }
    ]
  },
  "action": {
    "keepCsp": true
  }
}
```

### Request cookie

`requestCookie` adds, updates or removes one cookie in the `Cookie` header.

| Key     | Type   | Values                                             | Default       |
| ------- | ------ | -------------------------------------------------- | ------------- |
| `op`    | string | An [operation](#operations).                       | `addOrUpdate` |
| `name`  | string | The cookie name; required.                         | `""`          |
| `value` | string | The cookie value; can use `{{variables}}`. Ignored by `remove`. | `""` |

```json
{
  "id": "beta-cookie",
  "name": "Turn on the beta",
  "enabled": true,
  "type": "requestCookie",
  "criteria": {
    "match": "all",
    "items": []
  },
  "action": {
    "op": "addOrUpdate",
    "name": "beta",
    "value": "1"
  }
}
```

### Response cookie

`responseCookie` adds, updates or removes a `Set-Cookie` with its attributes.

| Key        | Type    | Values                                                                 | Default       |
| ---------- | ------- | ---------------------------------------------------------------------- | ------------- |
| `op`       | string  | An [operation](#operations).                                           | `addOrUpdate` |
| `name`     | string  | The cookie name; required.                                             | `""`          |
| `value`    | string  | The cookie value; empty keeps the server's value when updating.        | `""`          |
| `domain`   | string  | The `Domain` attribute; empty leaves it out.                           | `""`          |
| `path`     | string  | The `Path` attribute.                                                  | `/`           |
| `maxAge`   | string  | `Max-Age` in seconds, as text; empty leaves it out.                    | `""`          |
| `sameSite` | string  | `""` (not set), `Lax`, `Strict` or `None`.                             | `""`          |
| `secure`   | boolean | Adds `Secure`.                                                         | `false`       |
| `httpOnly` | boolean | Adds `HttpOnly`.                                                       | `false`       |

- **Add or update** keeps the attributes left empty from the `Set-Cookie` already there.
- `remove` only needs `op` and `name`.

```json
{
  "id": "session-cookie",
  "name": "Long session cookie",
  "enabled": true,
  "type": "responseCookie",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "path",
        "op": "wildcard",
        "name": "",
        "value": "/auth/login",
        "negate": false
      }
    ]
  },
  "action": {
    "op": "addOrUpdate",
    "name": "session",
    "value": "",
    "domain": "",
    "path": "/",
    "maxAge": "86400",
    "sameSite": "Lax",
    "secure": true,
    "httpOnly": true
  }
}
```

### Redirect

`redirect` answers with a redirect status and a `Location` header; the browser follows it.

| Key      | Type   | Values                                                                                 | Default |
| -------- | ------ | -------------------------------------------------------------------------------------- | ------- |
| `target` | string | The `Location` URL; required. `$1` to `$9` from a `url` regex condition; can use `{{variables}}`. | `""` |
| `status` | number | `301`, `302`, `303`, `307` or `308`; anything else becomes `308`.                      | `308`   |

```json
{
  "id": "old-docs",
  "name": "Old docs to the new site",
  "enabled": true,
  "type": "redirect",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "url",
        "op": "regex",
        "name": "",
        "value": "^https://docs\\.example\\.com/v1/(.*)$",
        "negate": false
      }
    ]
  },
  "action": {
    "target": "https://docs.example.com/v2/$1",
    "status": 302
  }
}
```

### Rewrite

`rewrite` silently sends the request to another URL, with no redirect.

| Key      | Type   | Values                                                                                 | Default |
| -------- | ------ | -------------------------------------------------------------------------------------- | ------- |
| `target` | string | The new URL; required. `$1` to `$9` from a `url` regex condition; can use `{{variables}}`. | `""` |

- A `target` that uses `$1` to `$9` needs a `url` condition with `regex`.
- With groups, the rule works on all tabs only when that regex is its one URL condition.

```json
{
  "id": "api-to-local",
  "name": "API to localhost",
  "enabled": true,
  "type": "rewrite",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "url",
        "op": "regex",
        "name": "",
        "value": "^https://api\\.example\\.com/(.*)$",
        "negate": false
      }
    ]
  },
  "action": {
    "target": "http://{{apiHost}}/$1"
  }
}
```

### Query params

`queryParams` adds, updates or removes query string parameters.

| Key          | Type  | Values                                                                                          | Default                                         |
| ------------ | ----- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `operations` | array | [Operations](#operations); `name` is the parameter, `value` can use `{{variables}}`. `remove` takes wildcard names such as `utm_*`. | one `addOrUpdate` with an empty name and value |

- Wildcard names, **Add** and **Add if missing** work on the inspected tab only.

```json
{
  "id": "strip-tracking",
  "name": "Strip tracking params",
  "enabled": true,
  "type": "queryParams",
  "criteria": {
    "match": "all",
    "items": []
  },
  "action": {
    "operations": [
      {
        "op": "remove",
        "name": "utm_*",
        "value": ""
      },
      {
        "op": "addOrUpdate",
        "name": "debug",
        "value": "true"
      }
    ]
  }
}
```

### HTTP to HTTPS

`upgradeScheme` upgrades `http` requests to `https`.  
Its `action` is `{}`.

```json
{
  "id": "https-only",
  "name": "Force HTTPS",
  "enabled": true,
  "type": "upgradeScheme",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "host",
        "op": "domains",
        "name": "",
        "value": "example.com",
        "negate": false
      }
    ]
  },
  "action": {}
}
```

### Mock response

`mockResponse` answers with your own status, body or both; with both, the server is never called.

| Key              | Type    | Values                                                                    | Default            |
| ---------------- | ------- | ------------------------------------------------------------------------- | ------------------ |
| `overrideStatus` | boolean | Answer with `status`.                                                     | `true`             |
| `status`         | number  | `100` to `599`.                                                           | `200`              |
| `overrideBody`   | boolean | Answer with `body` and `contentType`.                                     | `true`             |
| `contentType`    | string  | The `Content-Type` of the body.                                           | `application/json` |
| `headers`        | array   | Extra response headers, as `{ "key": "...", "value": "..." }`; note `key`, not `name`. | `[]`  |
| `body`           | string  | The body text; can use `{{variables}}`. JSON goes in as an escaped string. | `{}`              |

- At least one of `overrideStatus` and `overrideBody` must be `true`.
- With only one on, the server answers and the rule changes that part of its answer.
- With a response condition, the rule waits for the server and changes its answer even with both on.
- It answers the CORS preflight of a call it mocks, so a cross-origin mock needs no **CORS** rule.
- To block a request, mock it with a status such as `403`.

```json
{
  "id": "users-mock",
  "name": "Users mock",
  "enabled": true,
  "type": "mockResponse",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "method",
        "op": "oneOf",
        "name": "",
        "value": "GET",
        "negate": false
      },
      {
        "field": "path",
        "op": "wildcard",
        "name": "",
        "value": "/api/v1/users/*",
        "negate": false
      }
    ]
  },
  "action": {
    "overrideStatus": true,
    "status": 200,
    "overrideBody": true,
    "contentType": "application/json",
    "headers": [
      {
        "key": "X-Mocked",
        "value": "true"
      }
    ],
    "body": "{\"id\":42,\"name\":\"Ada\"}"
  }
}
```

### Latency

`delay` holds matching requests before they go out.

| Key       | Type   | Values                                      | Default |
| --------- | ------ | ------------------------------------------- | ------- |
| `delayMs` | number | Milliseconds, above `0` and up to `10000`.  | `2000`  |

- Preflight `OPTIONS` requests skip it, so CORS checks still pass in time.

```json
{
  "id": "slow-search",
  "name": "Slow search",
  "enabled": true,
  "type": "delay",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "path",
        "op": "wildcard",
        "name": "",
        "value": "/api/v1/search*",
        "negate": false
      }
    ]
  },
  "action": {
    "delayMs": 3000
  }
}
```

### Request body

`requestBodyModify` replaces the request body, merges a JSON patch into it, or finds and replaces in it.

| Key           | Type   | Used by `mode`          | Values                                                                 | Default   |
| ------------- | ------ | ----------------------- | ---------------------------------------------------------------------- | --------- |
| `mode`        | string |                         | `replace`, `jsonMerge` or `findReplace`.                               | `replace` |
| `body`        | string | `replace`, `jsonMerge`  | The new body, or the JSON patch; can use `{{variables}}`.              | `""`      |
| `contentType` | string | `replace`               | The new `Content-Type`; empty keeps the one there.                     | `""`      |
| `find`        | string | `findReplace`           | The text or regex to find.                                             | `""`      |
| `findAs`      | string | `findReplace`           | `text` or `regex`.                                                     | `text`    |
| `replace`     | string | `findReplace`           | The replacement; with `regex`, `$1` inserts a group. Can use `{{variables}}`. | `""` |

- `jsonMerge` follows RFC 7386: keys in the patch are set, `null` removes a key.
  A patch that isn't valid JSON makes the rule invalid.
- Without a body, only `replace` acts.

```json
{
  "id": "order-quantity",
  "name": "Order 99 items",
  "enabled": true,
  "type": "requestBodyModify",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "method",
        "op": "oneOf",
        "name": "",
        "value": "POST",
        "negate": false
      },
      {
        "field": "path",
        "op": "wildcard",
        "name": "",
        "value": "/api/v1/orders",
        "negate": false
      }
    ]
  },
  "action": {
    "mode": "jsonMerge",
    "body": "{\"quantity\":99,\"coupon\":null}",
    "contentType": "",
    "find": "",
    "findAs": "text",
    "replace": ""
  }
}
```

### Response body

`responseBodyReplace` does the same as **Request body**, on the response, with the same keys.  
**Replace the body** edits what the server sent; a **Mock response** with only `overrideBody` gives the same answer.

```json
{
  "id": "rename-plan",
  "name": "Show the gold plan",
  "enabled": true,
  "type": "responseBodyReplace",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "path",
        "op": "wildcard",
        "name": "",
        "value": "/api/v1/account",
        "negate": false
      }
    ]
  },
  "action": {
    "mode": "findReplace",
    "body": "",
    "contentType": "",
    "find": "\"plan\":\"(\\w+)\"",
    "findAs": "regex",
    "replace": "\"plan\":\"gold\""
  }
}
```

### Set variable

`setVariable` captures a value from the request or the response, for `{{name}}` in other rules.

| Key        | Type   | Used by `source`                                    | Values                                                         | Default |
| ---------- | ------ | --------------------------------------------------- | -------------------------------------------------------------- | ------- |
| `variable` | string | all                                                 | The variable name, without braces; required.                   | `""`    |
| `source`   | string | all                                                 | One of the sources below.                                      | `url`   |
| `key`      | string | `query`, `requestHeader`, `requestCookie`, `responseHeader` | The parameter, header or cookie name.                  | `""`    |
| `path`     | string | the four body sources                               | JSONPath for JSON, XPath for XML; required for them.           | `""`    |
| `pattern`  | string | the other sources                                   | Optional regex; its first group, or the whole match, is kept.  | `""`    |

| `source`           | Reads                                 |
| ------------------ | ------------------------------------- |
| `url`              | the request URL                       |
| `query`            | a query parameter, named by `key`     |
| `requestHeader`    | a request header, named by `key`      |
| `requestCookie`    | a request cookie, named by `key`      |
| `responseHeader`   | a response header, named by `key`     |
| `requestBodyJson`  | the request body, with a JSONPath     |
| `responseBodyJson` | the response body, with a JSONPath    |
| `requestBodyXml`   | the request body, with an XPath       |
| `responseBodyXml`  | the response body, with an XPath      |

| Path     | Supports                                                                                                               | Example                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| JSONPath | `$`, `.name`, `['name']`, `[0]`, `[-1]` from the end, `.length` of an array or text                                    | `$.items[0].id`                |
| XPath    | `/` child, `//` any depth, `*`, `[1]` (`[-1]` is the last), `[@name='value']`, `@name`, `text()`; the first match wins | `//item[@kind='primary']/@sku` |

- Objects and arrays come out as JSON text.
- A source or path that finds nothing leaves the variable as it was.

```json
{
  "id": "capture-token",
  "name": "Capture the login token",
  "enabled": true,
  "type": "setVariable",
  "criteria": {
    "match": "all",
    "items": [
      {
        "field": "path",
        "op": "wildcard",
        "name": "",
        "value": "/auth/login",
        "negate": false
      },
      {
        "field": "responseStatus",
        "op": "range",
        "name": "",
        "value": "2xx",
        "negate": false
      }
    ]
  },
  "action": {
    "variable": "token",
    "source": "responseBodyJson",
    "key": "",
    "path": "$.accessToken",
    "pattern": ""
  }
}
```

## Ask an assistant

**Copy rule format**, under **Write rules with AI** in **Import / export**, copies this file.  
Paste it into a chat with an assistant, add what you want, then paste the whole answer in the **Import** box, press **Read pasted JSON**, and import it with **Merge**.

```text
Using the Rewire rule JSON above, write rules that:
- mock GET /api/v1/orders with a 500 and {"error":"down"}
- add 3 seconds of latency to /api/v1/search
Answer with one import file only.
```

The answer should follow these points:

- One JSON code block holding a whole file: `schemaVersion` `5` and one new profile, with an `id` that isn't `default`.
- Only the `type` ids, keys and values in this file, with every `action` key of the type written out.
- Unique rule `id` values, short and readable, such as `orders-500`.
- Condition `value` always as a string, even for numbers, such as `"10"`.
- `status` and `delayMs` as numbers.
- Bodies as escaped JSON strings, such as `"{\"id\":42}"`.
- Rules in the order they should run; for the same header, the lower rule wins.
- Secrets as `{{variables}}` in the profile's `variables`, with empty values to fill in.
- One line after the block for each rule that works on the inspected tab only.
