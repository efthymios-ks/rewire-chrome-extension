# WS Client

The **WS Client** tab shows the WebSockets of the inspected page and opens your own.  
WebSocket frames never show in the [Traffic](Traffic.md) timeline.  
The tab badge counts the open sockets, the page's and yours.

## Listen to page sockets

The **Listen to page sockets** switch in the header is off each time the panel opens.

- While it is off, Rewire ignores the inspected tab's sockets, so they cost nothing.
- While it is on, the sockets the inspected tab and its iframes open from then on show in the list.
- Your own sockets work either way.
- The switch follows you when you inspect another tab.

## Connect

Type the socket URL, such as `wss://ws.postman-echo.com/raw`, a public echo server, and press **Connect**.

- The URL, header values and messages take the active profile's `{{variables}}`.
- The browser sends the target site's cookies with the handshake.
- **Headers · N** folds out to name and value rows, with **Add header** and **×**.
  The headers go on the handshake through a temporary `declarativeNetRequest` session rule for that exact URL.
  The rule is removed when the socket closes.

## Sockets

The **Sockets** list holds your own sockets, and the page's sockets captured while **Listen to page sockets** is on, newest first.

| Part        | Shows                                             |
| ----------- | ------------------------------------------------- |
| Dot         | green while the socket is open, grey once closed  |
| Tag         | **Page** for the page's socket, **Mine** for yours |
| Address     | host and path                                     |
| Count       | how many frames the socket carried                |
| **×**       | closes your own open socket, or removes a closed socket and its frames |

- **Clear closed** next to the title removes every closed socket and its frames; it shows while there is one.
- Pick a socket to show its frames.  
The page's sockets are read only, and nothing is ever sent through them.

## Frames

The **Frames** list shows the frames of the picked socket, newest first, one line each.

- Each line shows `↑` for a sent frame or `↓` for a received one, the payload, and the time in UTC as `HH:MM:SS`.
- Control frames, such as `ping`, `pong` and `close`, are muted and in italics.
- The filter box keeps the frames whose payload holds the text, ignoring case.
- Click a frame to open its details in place, and click it again to close them.
- The list keeps the frames you are reading in place while new ones arrive above them; scroll up to the top for the newest.

Frame details hold:

- a facts line with the direction, the opcode, the size, and the time with milliseconds;
- **Copy**, which copies the payload;
- **Open JWT**, when the payload holds a JWT, which opens the token in the [JWT](Jwt.md) tab;
- the payload as a JSON tree when it is JSON, or as raw text.

A Socket.IO packet, such as `42["chat",{"text":"hi"}]`, shows the JSON after the packet number as a tree.  
A binary frame shows its bytes as base64.

## Send

The send bar shows only while one of your own sockets is picked and open.

- Type the message and press **Send**, or **Enter**.
- The message goes out as a text frame, with `{{variables}}` filled in from the active profile.
- The message stays in the box, so it can be sent again.

## Left out

- Saved messages, and a JSON or text toggle.
- Sending through the page's sockets, and frames made up by Rewire.
- Recording and replaying a socket.
- Rules on WebSocket frames.
