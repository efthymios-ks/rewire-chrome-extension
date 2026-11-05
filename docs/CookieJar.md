# Cookie Jar

Lists every cookie the inspected page receives, including `HttpOnly` and `Secure` ones that page scripts can't read.  
The page's address shows next to the title.

- Each row shows name, domain, path, expiry, HttpOnly, Secure and SameSite; on a narrow panel, one line per field.
  A cookie the server sent without SameSite shows **Not set (Lax)**, which is how Chrome treats it.
  Expiry shows in UTC, as `2027-12-11T18:37:25Z`.
- Click a row to open it: its value and actions appear below it.
  One row is open at a time.
- **Edit** opens the cookie in a form; the name stays fixed.
- **Make rule** opens a **Request cookie** rule that sends this cookie on every request to its domain.
- **Add cookie** starts a host-only cookie for the page's host.
- **Remove** asks first, then removes it.
- The list refreshes when a cookie of the page changes.

**Edit** and **Add cookie** open a form:

| Field     | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| Domain    | Cookie domain. Uncheck **Host only** to share with subdomains.  |
| Path      | Cookie path. `/` by default.                                    |
| Expires   | Local date and time. Empty makes a session cookie.              |
| SameSite  | Not set (Lax), Lax, Strict or None. None needs Secure.          |
| Secure    | Sent over https only.                                           |
| HttpOnly  | Hidden from page scripts.                                       |

Partitioned (CHIPS) cookies are not listed.
