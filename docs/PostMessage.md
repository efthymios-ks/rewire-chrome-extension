# postMessage

The **postMessage** tab shows the `window.postMessage` messages between the inspected page and its iframes, and sends your own.  
postMessage messages never show in the [Traffic](Traffic.md) timeline.  
The tab badge counts the messages.

## Listen to page messages

The **Listen to page messages** switch in the header is off each time the panel opens.

- While it is off, Rewire adds nothing to the page, so it costs nothing.
- While it is on, Rewire adds a `message` listener to the inspected tab and its iframes, and the messages show in the list.
- Sending works either way; while the switch is off, a notice says where to see the message.

## Messages

Each message takes two lines: `from → to` and the time in UTC as `HH:MM:SS` on top, and the data below, newest first.

- A frame is named `top` for the page itself, or by its host, such as `pay.example.com`, for an iframe.
- The sender is `top` when the page sent the message, and the host of the message's origin otherwise.
- Data that isn't a string shows as JSON.
- Messages you send are tagged **Sent by you**.
- The frame list in the header keeps only the messages from or to the picked frame; it offers **All frames**, `top` and each iframe by host.

The list keeps the messages you are reading in place while new ones arrive above them.  
Click a message to open its details in place, and click it again to close them.  
Details hold a facts line with the origin, the size, and the time with milliseconds, then **Copy**, **Open JWT** when the data holds a JWT, **Use**, and the data as a JSON tree or raw text.  
**Use** copies the message's target frame and data into the send bar.

## Send

The send bar holds the target frame, such as `To top` or `To pay.example.com`, the data, and **Send**; **Enter** sends too.

- Data that is a JSON object or array is sent as that object; anything else is sent as the text typed.
- `{{variables}}` in the data are filled in from the active profile.
- A message to an iframe is posted from the page, so the iframe sees the page as its sender and origin.
  The iframe is found by the host of its `src`, among the iframes of the page itself.
- A message to `top` is posted by the page to itself.
- On a wide panel the bar is one line.
  Below 560 px the target and **Send** share the first line, and the data takes the second.

## How capture works

While **Listen to page messages** is on, Rewire adds a listener for `message` events to the page and to every iframe, through the debugger, and removes it when the switch goes off.

- Frames that load after the switch goes on are captured from their first message.
- Same-origin iframes that were already loaded join after the page reloads.
- Messages a page sends before the switch goes on are not captured.

## Left out

- Replaying messages, and rules on messages.
