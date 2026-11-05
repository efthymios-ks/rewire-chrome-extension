type ElementListeners = {
    [TEventName in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[TEventName]) => void;
};

export type ElementChild = Node | string | null;

export interface ElementOptions {
    className?: string;
    text?: string;
    title?: string;
    attributes?: Record<string, string>;
    listeners?: ElementListeners;
    children?: ElementChild[];
}

export function buildElement<TTagName extends keyof HTMLElementTagNameMap>(
    tagName: TTagName,
    options: ElementOptions = {}
): HTMLElementTagNameMap[TTagName] {
    const element = document.createElement(tagName);
    if (options.className !== undefined) {
        element.className = options.className;
    }

    if (options.text !== undefined) {
        element.textContent = options.text;
    }

    if (options.title !== undefined) {
        element.title = options.title;
    }

    Object
        .entries(options.attributes ?? {})
        .forEach(([name, value]) => element.setAttribute(name, value));
    Object
        .entries(options.listeners ?? {})
        .forEach(([eventName, listener]) => element.addEventListener(eventName, listener as EventListener));

    const children = (options.children ?? []).filter((child): child is Node | string => child !== null);
    element.append(...children);

    return element;
}
