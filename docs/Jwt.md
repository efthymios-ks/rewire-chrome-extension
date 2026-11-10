# JWT

The **JWT** tab decodes a JSON Web Token.

- Paste a token, with or without the `Bearer ` prefix.
- **Header** and **Claims** show the two JSON parts, indented.
- `iat`, `nbf` and `exp` show as UTC times, such as `2026-11-06T18:33:48Z`.
- The line on top says whether the token is valid, expired, not valid yet, or never expires.
- The signature is not checked, and the token never leaves the panel.

In the inspector, an `Authorization` request header that holds a JWT gets an open icon next to its value.  
Click it to open the JWT tab with that token.
