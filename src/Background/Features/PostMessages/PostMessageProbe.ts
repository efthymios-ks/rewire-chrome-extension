export const PostMessageBindingName = "__rewirePostMessage";

export interface PostMessageReport {
    origin: string;
    href: string;
    isTop: boolean;
    isFromTop: boolean;
    isFromSelf: boolean;
    data: string;
}

export const PostMessageProbe = {
    source: `(() => {
    const binding = globalThis[${JSON.stringify(PostMessageBindingName)}];
    if (typeof binding !== "function" || globalThis.__rewirePostMessageProbe === true) {
        return;
    }

    Object.defineProperty(globalThis, "__rewirePostMessageProbe", { value: true });
    const textOf = data => {
        if (typeof data === "string") {
            return data;
        }

        try {
            return JSON.stringify(data) ?? String(data);
        } catch {
            return String(data);
        }
    };
    globalThis.addEventListener("message", event => {
        binding(JSON.stringify({
            origin: event.origin,
            href: location.href,
            isTop: globalThis === globalThis.top,
            isFromTop: event.source === globalThis.top,
            isFromSelf: event.source === globalThis,
            data: textOf(event.data),
        }));
    }, true);
})();`,

    parse(payload: string): PostMessageReport | null {
        try {
            const parsed: unknown = JSON.parse(payload);
            if (typeof parsed !== "object" || parsed === null) {
                return null;
            }

            const report = parsed as Partial<PostMessageReport>;
            const isValid = typeof report.origin === "string"
                && typeof report.href === "string"
                && typeof report.isTop === "boolean"
                && typeof report.isFromTop === "boolean"
                && typeof report.isFromSelf === "boolean"
                && typeof report.data === "string";

            return isValid ? report as PostMessageReport : null;
        } catch {
            return null;
        }
    },
};
