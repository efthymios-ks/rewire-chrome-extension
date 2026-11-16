# Cookie Jar

Lists every cookie the browser holds for the inspected page's address, including `HttpOnly` and `Secure` ones that page scripts can't read, and partitioned (CHIPS) ones kept for the page's site.  
The page's origin, such as `https://shop.example.com`, shows next to the title.

- Each row shows name, domain, path, expiry, HttpOnly, Secure, SameSite and Partitioned; on a narrow panel, one line per field.
  A cookie the server sent without SameSite shows **Not set (Lax)**, which is how Chrome treats it.
  Expiry shows in UTC, as `2027-12-11T18:37:25Z`, or `Session`; HttpOnly, Secure and Partitioned show `Yes` or `No`.
- The search box keeps the cookies whose name or value contains the text, ignoring case.
- Click a row to open it: its value and actions appear below it.
  One row is open at a time.
- **Edit** opens the cookie in a form; the name stays fixed.
  Changing the domain, the path or **Host only** replaces the cookie: the edited one is saved first, and the original is removed only once that save succeeds.
- **Make rule** opens a **Request cookie** rule that sends this cookie on every request to its domain.
- **Add cookie** starts a host-only cookie for the page's host, with path `/`, SameSite **Lax**, and **Secure** ticked on an https page.
- **Remove** asks first, then removes it.
- The list refreshes when a cookie of the page changes; **Refresh** reloads it by hand.

**Edit** and **Add cookie** open a form:

| Field     | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| Name      | Cookie name. Fixed when editing.                                |
| Value     | Cookie value.                                                   |
| Domain    | Cookie domain. Uncheck **Host only** to share with subdomains.  |
| Path      | Cookie path. `/` by default.                                    |
| Expires   | Local date and time. Empty makes a session cookie.              |
| SameSite  | Not set (Lax), Lax, Strict or None. None needs Secure.          |
| Secure    | Sent over https only.                                           |
| HttpOnly  | Hidden from page scripts.                                       |

A partitioned cookie stays in its partition: **Edit** saves it there and **Remove** removes it from there.
