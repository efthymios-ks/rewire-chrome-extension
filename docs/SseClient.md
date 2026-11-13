# SSE Client

The **SSE Client** tab shows the server-sent event streams of the inspected page and opens your own.  
Event streams never show in the [Traffic](Traffic.md) timeline.  
The tab badge counts the open streams, the page's and yours.

## Listen to page streams

The **Listen to page streams** switch in the header is off each time the panel opens.

- While it is off, Rewire ignores the inspected tab's event streams, and a page `fetch` that answers with `text/event-stream` stays in Traffic as a call.
- While it is on, the streams the inspected tab and its iframes open from then on show in the list.
- Your own streams work either way.

## Subscribe

Type the stream URL, such as `https://sse.tools.typinks.com/api/story`, a public test stream, and press **Subscribe**.

- The URL and header values take the active profile's `{{variables}}`.
- **Headers · N** folds out to name and value rows, with **Add header** and **×**, as in the [WS Client](WsClient.md).
- The panel opens the stream with a streaming `fetch` that sends `Accept: text/event-stream`, the headers, and the target site's cookies.
- The panel reads the `event`, `id`, `retry` and `data` fields of each event as the stream arrives.
- A refused stream, such as a `401`, shows the status in a notice and closes.

## Streams

The **Streams** list holds the page's streams and your own, newest first, with the same dot, tag, address and count as the WS Client's sockets.

- The page's streams are its `EventSource` connections and its streaming `fetch` calls that answer with `text/event-stream`, captured while **Listen to page streams** is on.
- While the switch is on, a page `fetch` that turns out to be an event stream leaves the Traffic timeline once its answer arrives.
- **×** stops your own open stream, or removes a closed stream and its events.
- **Clear closed** next to the title removes every closed stream and its events; it shows while there is one.

## Events

The **Events** list shows the events of the picked stream, newest first.

- An event with data takes two lines: the event name, or `message` when the stream names none, and the time in UTC as `HH:MM:SS` on top, and the data below.
- An event without data, such as a bare `event: ping`, takes one line, muted and in italics.
- The filter box keeps the events whose name or data holds the text, ignoring case.
- Click an event to open its details in place, and click it again to close them.
- The list keeps the events you are reading in place while new ones arrive above them; scroll up to the top for the newest.

Event details hold a facts line with the event name, the id, the retry, the size, and the time with milliseconds, then **Copy**, **Open JWT** when the data holds a JWT, and the data as a JSON tree or raw text.  
The page's `EventSource` events carry no retry, so their retry shows `none`.

## Left out

- A send bar; event streams only flow from the server.
- Raw chunks, events made up by Rewire, and rules on events.
