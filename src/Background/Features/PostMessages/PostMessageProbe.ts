import { POST_MESSAGE_BINDING_NAME } from './PostMessageBindingName';

export interface PostMessageReport {
    origin: string;
    href: string;
    isTop: boolean;
    isFromTop: boolean;
    isFromSelf: boolean;
    data: string;
}

const PROBE_SYMBOL_KEY = 'rewire.postMessageProbe';

const REMOVE_INSTALLED_PROBE = `const probeKey = Symbol.for(${JSON.stringify(PROBE_SYMBOL_KEY)});
    const installedProbe = globalThis[probeKey];
    if (typeof installedProbe?.remove === "function") {
        installedProbe.remove();
    }`;

export const PostMessageProbe = {
    source: `(() => {
    ${REMOVE_INSTALLED_PROBE}

    const binding = globalThis[${JSON.stringify(POST_MESSAGE_BINDING_NAME)}];
    if (typeof binding !== "function") {
        return;
    }

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
    const listener = event => {
        binding(JSON.stringify({
            origin: event.origin,
            href: location.href,
            isTop: globalThis === globalThis.top,
            isFromTop: event.source === globalThis.top,
            isFromSelf: event.source === globalThis,
            data: textOf(event.data),
        }));
    };
    globalThis.addEventListener("message", listener, { capture: true });
    Object.defineProperty(globalThis, probeKey, {
        configurable: true,
        value: {
            remove: () => {
                globalThis.removeEventListener("message", listener, { capture: true });
                delete globalThis[probeKey];
            },
        },
    });
})();`,

    removalSource: `(() => {
    ${REMOVE_INSTALLED_PROBE}
})();`,

    parse(payload: string): PostMessageReport | null {
        try {
            const parsed: unknown = JSON.parse(payload);
            if (typeof parsed !== 'object' || parsed == null) {
                return null;
            }

            const report = parsed as Partial<PostMessageReport>;
            const isValid = typeof report.origin === 'string'
                && typeof report.href === 'string'
                && typeof report.isTop === 'boolean'
                && typeof report.isFromTop === 'boolean'
                && typeof report.isFromSelf === 'boolean'
                && typeof report.data === 'string';

            return isValid ? report as PostMessageReport : null;
        } catch {
            return null;
        }
    },
};
