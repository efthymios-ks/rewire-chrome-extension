# Client

The **Client** tab sends a request from the panel and shows the answer.

- Pick the method, type the URL, add headers and a body, then **Send**.
- Header names suggest the common ones.
- The body goes with every method except `GET` and `HEAD`.
- Headers the browser forbids in `fetch`, such as `Cookie` or `Host`, are dropped.
- The request leaves from the panel, not the page, so inspected-tab rules don't act on it.

The answer shows its status with the reason phrase, and how long it took.

- **Body** shows the response text, indented when it is JSON.
- **Headers** lists the response headers.
- A request that never got an answer, such as a refused connection, shows the browser's error instead.

Each request, answered or failed, joins the [Traffic](Traffic.md) timeline of the inspected tab, so the inspector, search and **Code** tab work on it too.
