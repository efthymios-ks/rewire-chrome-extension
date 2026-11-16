# HAR Inspector

The **HAR Inspector** tab opens a `.har` file and shows its calls the way [Traffic](Traffic.md) shows live ones.  
The file stays in this tab only; Traffic, the rules and the live timeline stay as they are.

## Open a file

- Press **Open .har** in the header, or drop a file anywhere on the tab.
- Or press **Ctrl+V** on the tab to open HAR text from the clipboard, such as a HAR copied with **Copy HAR** in Traffic.
  It opens as `Pasted HAR`; pasting into a field, such as the search box, pastes into the field as usual.
- The header shows the file name and its entry count, such as `staging.har · 42 entries`, with **Close file** and **Open .har**.
- **Close file** goes back to the drop area.
- A file that can't be read shows a notice, such as `Can't open broken.har: it isn't valid JSON.` or `…: it has no log.entries list.`, and the tab stays as it was.
  A dropped file the browser can't read shows `Can't read` with its name and the reason.

## What shows

The body is the Traffic timeline and inspector: content filter chips, **List** and **Waterfall**, search, the inspector tabs, **Code**, **Open in HTTP Client** and **Copy URL**.

- The newest entry sits on top, as in Traffic.
- Entries with a URL that isn't valid are skipped.
- A base64 body, a response's `content.text` or a request's `postData.text` with `encoding` set to `base64`, is decoded when its type is text; otherwise it shows `Binary body (N bytes), not shown.`
- A response without `content.text` shows its `content.comment`, such as why it wasn't captured.
- A request's `postData.comment` shows above its body, or alone when `postData` has no `text`, such as the notes a Rewire HAR carries for decompressed and binary bodies.
- A form body given as `params` becomes a URL-encoded body.
- An entry with status `0` or an `_error` shows as failed, with its error.

**Mock this**, **Pin**, the frame list, the HAR export and **Clear** are hidden, since a file is not live traffic.

## Left out

- Comparing two files.
- Turning entries into mock rules.
- Cleaning secrets out of a file.
