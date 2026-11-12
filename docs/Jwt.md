# JWT

The **JWT** tab decodes a JSON Web Token.

- Paste a token, with or without the `Bearer ` prefix.
- **Header** and **Claims** list each key with its value, like the inspector's headers.
  Values show in full and wrap, so any of them can be selected and copied.
- A value that is an object or an array, or text that holds one, such as `"[{\"Type\":\"User\"}]"`, breaks down into its own keys and values, nested under its key; array items take their index as the key.
- `iat`, `nbf` and `exp` show as UTC times with the seconds after them, such as `2026-11-12T10:14:48Z (1794478488)`.
- **List** or **Raw** above the parts switches both: **Raw** shows them as indented JSON.
  The choice stays while you paste other tokens.
- The line on top says whether the token is valid, expired, not valid yet, or never expires.
- The signature is not checked, and the token never leaves the panel.

In the inspector's **Request Headers** tab, an `Authorization` header that holds a JWT gets an open icon next to its value.  
Click it to open the JWT tab with that token.
